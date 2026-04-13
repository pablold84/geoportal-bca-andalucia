import secrets
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
import psycopg2
from psycopg2.extras import RealDictCursor

API_KEY_PREFIX = "gp_"
API_KEY_LENGTH = 32

RATE_LIMIT_TIERS = {
    "basic": 100,
    "premium": 1000
}


def generate_api_key() -> str:
    random_part = secrets.token_urlsafe(API_KEY_LENGTH)[:API_KEY_LENGTH]
    return f"{API_KEY_PREFIX}{random_part}"


def hash_api_key(api_key: str) -> str:
    return bcrypt.hashpw(api_key.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_api_key(api_key: str, key_hash: str) -> bool:
    try:
        return bcrypt.checkpw(api_key.encode('utf-8'), key_hash.encode('utf-8'))
    except Exception:
        return False


def get_key_prefix(api_key: str) -> str:
    return api_key[:8] if len(api_key) >= 8 else api_key


def validate_api_key(api_key: str, db_conn) -> Optional[Dict]:
    if not api_key or not api_key.startswith(API_KEY_PREFIX):
        return None

    cursor = None
    try:
        cursor = db_conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT
                id,
                key_hash,
                key_prefix,
                client_name,
                client_email,
                rate_limit_tier,
                requests_per_hour,
                is_active,
                expires_at
            FROM public.api_keys
            WHERE is_active = TRUE
        """)
        active_keys = cursor.fetchall()

        for key_record in active_keys:
            if verify_api_key(api_key, key_record['key_hash']):
                if key_record['expires_at'] and key_record['expires_at'] < datetime.now():
                    return None
                return dict(key_record)

        return None

    except Exception:
        return None
    finally:
        if cursor:
            cursor.close()


def check_rate_limit(api_key_id: int, db_conn) -> Tuple[bool, int, int]:
    cursor = None
    try:
        cursor = db_conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            SELECT requests_per_hour
            FROM public.api_keys
            WHERE id = %s
        """, (api_key_id,))

        result = cursor.fetchone()
        if not result:
            return False, 0, 0

        rate_limit = result['requests_per_hour']

        cursor.execute("""
            SELECT COUNT(*) as request_count
            FROM public.api_usage_logs
            WHERE api_key_id = %s
            AND timestamp > CURRENT_TIMESTAMP - INTERVAL '1 hour'
        """, (api_key_id,))

        count_result = cursor.fetchone()
        current_requests = count_result['request_count'] if count_result else 0
        can_proceed = current_requests < rate_limit

        return can_proceed, current_requests, rate_limit

    except Exception:
        return True, 0, 0
    finally:
        if cursor:
            cursor.close()


def log_api_usage(
    api_key_id: int,
    endpoint: str,
    method: str,
    response_status: int,
    response_time_ms: int,
    ip_address: Optional[str],
    user_agent: Optional[str],
    db_conn
) -> bool:
    cursor = None
    try:
        cursor = db_conn.cursor()
        cursor.execute("""
            INSERT INTO public.api_usage_logs (
                api_key_id,
                endpoint,
                method,
                response_status,
                response_time_ms,
                ip_address,
                user_agent
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            api_key_id,
            endpoint,
            method,
            response_status,
            response_time_ms,
            ip_address,
            user_agent
        ))
        db_conn.commit()
        return True

    except Exception:
        db_conn.rollback()
        return False
    finally:
        if cursor:
            cursor.close()


def create_api_key(
    client_name: str,
    client_email: str,
    description: str,
    rate_limit_tier: str,
    created_by: str,
    expires_in_days: Optional[int],
    db_conn
) -> Optional[Dict]:
    cursor = None
    try:
        if rate_limit_tier not in RATE_LIMIT_TIERS:
            return None

        api_key = generate_api_key()
        key_hash = hash_api_key(api_key)
        key_prefix = get_key_prefix(api_key)
        requests_per_hour = RATE_LIMIT_TIERS[rate_limit_tier]

        expires_at = None
        if expires_in_days:
            expires_at = datetime.now() + timedelta(days=expires_in_days)

        cursor = db_conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("""
            INSERT INTO public.api_keys (
                key_hash,
                key_prefix,
                client_name,
                client_email,
                description,
                rate_limit_tier,
                requests_per_hour,
                created_by,
                expires_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, key_prefix, client_name, rate_limit_tier, created_at
        """, (
            key_hash,
            key_prefix,
            client_name,
            client_email,
            description,
            rate_limit_tier,
            requests_per_hour,
            created_by,
            expires_at
        ))

        result = cursor.fetchone()
        db_conn.commit()

        return {
            "id": result['id'],
            "api_key": api_key,
            "key_prefix": result['key_prefix'],
            "client_name": result['client_name'],
            "rate_limit_tier": result['rate_limit_tier'],
            "requests_per_hour": requests_per_hour,
            "created_at": result['created_at'],
            "expires_at": expires_at
        }

    except Exception:
        db_conn.rollback()
        return None
    finally:
        if cursor:
            cursor.close()


def revoke_api_key(api_key_id: int, revoked_by: str, db_conn) -> bool:
    cursor = None
    try:
        cursor = db_conn.cursor()
        cursor.execute("""
            UPDATE public.api_keys
            SET
                is_active = FALSE,
                revoked_at = CURRENT_TIMESTAMP,
                revoked_by = %s
            WHERE id = %s
        """, (revoked_by, api_key_id))

        db_conn.commit()
        return cursor.rowcount > 0

    except Exception:
        db_conn.rollback()
        return False
    finally:
        if cursor:
            cursor.close()