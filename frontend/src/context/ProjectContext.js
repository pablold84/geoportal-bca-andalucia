import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import { API_BASE } from '../config';
import { getProjectConfig } from '../config/projects';

const ProjectContext = createContext();

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject debe usarse dentro de ProjectProvider');
  }
  return context;
};

export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [projectConfig, setProjectConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const andaluciaProject = {
      project_code: 'bca',
      project_name: 'Base Cartográfica Autonómica',
      is_active: true
    };
    setProjects([andaluciaProject]);
    setCurrentProject(andaluciaProject);
    setProjectConfig(getProjectConfig('andalucia'));
    setLoading(false);
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`${API_BASE}/projects`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const data = await response.json();
      const activeProjects = data.filter(p => p.is_active);
      setProjects(activeProjects);

      if (activeProjects.length > 0) {
        const selected = activeProjects[0];
        setCurrentProject(selected);
        setProjectConfig(getProjectConfig(selected.project_code));
      }
    } catch {
      setError('Error cargando proyectos');
    } finally {
      setLoading(false);
    }
  };

  const changeProject = (project) => {
    if (typeof project === 'string') {
      const found = projects.find(p => p.project_code === project);
      if (found) {
        setCurrentProject(found);
        setProjectConfig(getProjectConfig(found.project_code));
      }
    } else if (project?.project_code) {
      setCurrentProject(project);
      setProjectConfig(getProjectConfig(project.project_code));
    }
  };

  const refreshProjects = async () => {
    await loadProjects();
  };

  const loadProjectsAfterLogin = async () => {
    await loadProjects();
  };

  const getProjectByCode = (code) => projects.find(p => p.project_code === code);
  const hasProject = () => currentProject !== null;
  const getCurrentProjectCode = () => currentProject?.project_code || null;
  const isCurrentProject = (code) => currentProject?.project_code === code;

  const value = {
    projects,
    currentProject,
    projectConfig,
    loading,
    error,
    changeProject,
    refreshProjects,
    loadProjectsAfterLogin,
    getProjectByCode,
    hasProject,
    getCurrentProjectCode,
    isCurrentProject
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export default ProjectContext;