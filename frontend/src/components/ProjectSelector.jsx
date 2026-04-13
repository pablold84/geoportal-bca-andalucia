import React, { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { useProject } from '../context/ProjectContext';

const ProjectIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const ProjectSelector = () => {
  const { projects, currentProject, changeProject, loading } = useProject();
  const [isChanging, setIsChanging] = useState(false);

  const handleProjectChange = async (projectCode) => {
    if (projectCode === currentProject?.project_code) return;

    setIsChanging(true);
    try {
      await changeProject(projectCode);
    } catch {
      alert('Error al cambiar de proyecto');
    } finally {
      setIsChanging(false);
    }
  };

  if (loading || !currentProject) {
    return (
      <div style={{ padding: '0.75rem', backgroundColor: 'rgba(210, 159, 42, 0.1)', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', color: 'var(--bs-warning)', fontSize: '0.85rem' }}>
        Cargando proyectos...
      </div>
    );
  }

  if (projects.length === 1) {
    return (
      <div style={{ padding: '0.75rem', backgroundColor: 'rgba(210, 159, 42, 0.12)', border: '1px solid rgba(210, 159, 42, 0.25)', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--bs-warning)' }}>
        <ProjectIcon />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Proyecto:</div>
          <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{currentProject.project_name}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--bs-warning)', opacity: 0.7, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Proyecto actual
      </div>

      <Dropdown>
        <Dropdown.Toggle
          style={{ width: '100%', backgroundColor: 'rgba(210, 159, 42, 0.12)', color: 'var(--bs-warning)', border: '1px solid rgba(210, 159, 42, 0.25)', borderRadius: '8px', padding: '0.75rem', fontWeight: '500', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem', transition: 'all 0.2s', cursor: isChanging ? 'wait' : 'pointer' }}
          disabled={isChanging}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ProjectIcon />
            <span>{currentProject.project_name}</span>
          </div>
        </Dropdown.Toggle>

        <Dropdown.Menu
          style={{ backgroundColor: 'var(--bs-primary)', border: '1px solid rgba(210, 159, 42, 0.3)', borderRadius: '8px', minWidth: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
        >
          {projects.map((project) => {
            const isActive = project.project_code === currentProject?.project_code;
            return (
              <Dropdown.Item
                key={project.project_code}
                onClick={() => handleProjectChange(project.project_code)}
                style={{ backgroundColor: isActive ? 'rgba(210, 159, 42, 0.15)' : 'transparent', color: 'var(--bs-warning)', borderRadius: '6px', padding: '0.75rem', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: isActive ? 'default' : 'pointer', transition: 'all 0.2s', border: isActive ? '1px solid rgba(210, 159, 42, 0.3)' : '1px solid transparent' }}
                onMouseEnter={(e) => { if (!isActive) e.target.style.backgroundColor = 'rgba(210, 159, 42, 0.1)'; }}
                onMouseLeave={(e) => { if (!isActive) e.target.style.backgroundColor = 'transparent'; }}
              >
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{project.project_name}</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: '0.25rem' }}>{project.project_code.toUpperCase()}</div>
                </div>
                {isActive && <CheckIcon />}
              </Dropdown.Item>
            );
          })}
        </Dropdown.Menu>
      </Dropdown>

      {isChanging && (
        <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: 'rgba(210, 159, 42, 0.1)', borderRadius: '6px', fontSize: '0.75rem', color: 'var(--bs-warning)', textAlign: 'center' }}>
          Cambiando proyecto...
        </div>
      )}
    </div>
  );
};

export default ProjectSelector;