/**
 * AI Homelab Ecosystem - Progress Dashboard Component
 * 
 * This component provides a comprehensive view of project progress tracked by AIHDS.
 * It displays projects, tasks, and status information from the MCP server.
 */

import React, { useState, useEffect } from 'react';
import { useProgress } from '../context/ProgressContext';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Button,
  Divider,
  CircularProgress,
  Alert,
  Paper,
  IconButton,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  useTheme
} from '@mui/material';
import SafeGrid from '@/components/SafeGrid';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import BlockIcon from '@mui/icons-material/Block';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

// Status chip component with appropriate color based on status
const StatusChip: React.FC<{ status: string }> = ({ status }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'not_started': return 'default';
      case 'failed': return 'error';
      case 'blocked': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircleIcon fontSize="small" />;
      case 'in_progress': return <HourglassEmptyIcon fontSize="small" />;
      case 'failed': return <ErrorIcon fontSize="small" />;
      case 'blocked': return <BlockIcon fontSize="small" />;
      default: return <HourglassEmptyIcon fontSize="small" style={{ opacity: 0 }} />; // Invisible placeholder instead of null
    }
  };

  // Use a null check to ensure the icon is properly handled
  const icon = getStatusIcon(status);

  return (
    <Chip 
      icon={icon}
      label={status.replace('_', ' ')}
      color={getStatusColor(status) as any}
      size="small"
      sx={{ textTransform: 'capitalize' }}
    />
  );
};

// Row component for projects/tasks with expandable details
interface RowProps {
  name: string;
  description?: string;
  percentage: number;
  status: string;
  lastUpdate: string;
  expandable?: boolean;
  children?: React.ReactNode;
}

const ProgressRow: React.FC<RowProps> = ({
  name,
  description,
  percentage,
  status,
  lastUpdate,
  expandable = false,
  children
}) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        {expandable && (
          <TableCell padding="checkbox">
            <IconButton
              aria-label="expand row"
              size="small"
              onClick={() => setOpen(!open)}
            >
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
        )}
        {!expandable && <TableCell />}
        <TableCell component="th" scope="row">
          <Typography variant="subtitle2">{name}</Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" noWrap>
              {description}
            </Typography>
          )}
        </TableCell>
        <TableCell align="right">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Box sx={{ width: '100%', mr: 1 }}>
              <LinearProgress 
                variant="determinate" 
                value={percentage} 
                color={status === 'failed' ? 'error' : status === 'blocked' ? 'warning' : 'primary'}
              />
            </Box>
            <Box sx={{ minWidth: 35 }}>
              <Typography variant="body2" color="text.secondary">{`${Math.round(percentage)}%`}</Typography>
            </Box>
          </Box>
        </TableCell>
        <TableCell align="right">
          <StatusChip status={status} />
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2" color="text.secondary">
            {new Date(lastUpdate).toLocaleString()}
          </Typography>
        </TableCell>
      </TableRow>
      {expandable && (
        <TableRow>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ margin: theme.spacing(1, 0, 2, 0) }}>
                {children}
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

// Main Progress Dashboard component
const ProgressDashboard: React.FC = () => {
  const { projects, loading, error, refreshProjects } = useProgress();
  const [refreshing, setRefreshing] = useState(false);

  // Handle manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshProjects();
    } finally {
      setTimeout(() => setRefreshing(false), 1000); // Minimum 1s refresh animation
    }
  };

  // Calculate overall statistics
  const stats = {
    total: projects.length,
    completed: projects.filter(p => p.status === 'completed').length,
    inProgress: projects.filter(p => p.status === 'in_progress').length,
    notStarted: projects.filter(p => p.status === 'not_started').length,
    failed: projects.filter(p => p.status === 'failed').length,
    blocked: projects.filter(p => p.status === 'blocked').length,
  };

  // Calculate overall percentage
  const overallPercentage = projects.length > 0
    ? Math.round(projects.reduce((sum, p) => sum + p.percentage, 0) / projects.length)
    : 0;

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          AIHDS Progress Tracking
        </Typography>
        <Button
          startIcon={refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading || refreshing}
          variant="outlined"
          size="small"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
          <Button size="small" onClick={handleRefresh} sx={{ ml: 2 }}>
            Retry
          </Button>
        </Alert>
      )}

      {loading && !refreshing ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Overview Cards */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
            <Box sx={{ width: { xs: '100%', sm: '47%', md: '23%' } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="div" gutterBottom>
                    Projects
                  </Typography>
                  <Typography variant="h3" component="div">
                    {stats.total}
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={overallPercentage} 
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {overallPercentage}% overall progress
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ width: { xs: '100%', sm: '47%', md: '23%' } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="div" gutterBottom>
                    Completed
                  </Typography>
                  <Typography variant="h3" component="div" color="success.main">
                    {stats.completed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% of all projects
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ width: { xs: '100%', sm: '47%', md: '23%' } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="div" gutterBottom>
                    In Progress
                  </Typography>
                  <Typography variant="h3" component="div" color="primary.main">
                    {stats.inProgress}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    {stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0}% of all projects
                  </Typography>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ width: { xs: '100%', sm: '47%', md: '23%' } }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="div" gutterBottom>
                    Blocked/Failed
                  </Typography>
                  <Typography variant="h3" component="div" color="error.main">
                    {stats.blocked + stats.failed}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    {stats.blocked} blocked, {stats.failed} failed
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>

          {/* Projects Table */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Project Details
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 4 }}>
            <Table aria-label="projects table">
              <TableHead>
                <TableRow>
                  <TableCell style={{ width: '50px' }}></TableCell>
                  <TableCell>Project</TableCell>
                  <TableCell align="right">Progress</TableCell>
                  <TableCell align="right">Status</TableCell>
                  <TableCell align="right">Last Update</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body1" sx={{ my: 3 }}>
                        No projects found. Projects will appear here when tracked by AIHDS.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((project) => (
                    <ProgressRow
                      key={project.id}
                      name={project.name}
                      description={project.description}
                      percentage={project.percentage}
                      status={project.status}
                      lastUpdate={project.lastUpdated}
                      expandable={project.tasks?.length > 0}
                    >
                      {project.tasks?.length > 0 && (
                        <Table size="small" aria-label="tasks">
                          <TableHead>
                            <TableRow>
                              <TableCell>Task</TableCell>
                              <TableCell>Priority</TableCell>
                              <TableCell align="right">Progress</TableCell>
                              <TableCell align="right">Status</TableCell>
                              <TableCell align="right">Last Update</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {project.tasks.map((task) => (
                              <TableRow key={task.id}>
                                <TableCell component="th" scope="row">
                                  <Typography variant="body2">{task.name}</Typography>
                                  {task.description && (
                                    <Typography variant="caption" color="text.secondary" display="block">
                                      {task.description}
                                    </Typography>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Chip 
                                    label={task.priority} 
                                    size="small"
                                    color={task.priority === 'high' ? 'error' : task.priority === 'medium' ? 'warning' : 'default'}
                                    sx={{ textTransform: 'capitalize' }}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                    <Box sx={{ width: '100%', mr: 1 }}>
                                      <LinearProgress 
                                        variant="determinate" 
                                        value={task.percentage} 
                                        color={task.status === 'failed' ? 'error' : task.status === 'blocked' ? 'warning' : 'primary'}
                                      />
                                    </Box>
                                    <Box sx={{ minWidth: 35 }}>
                                      <Typography variant="body2" color="text.secondary">{`${Math.round(task.percentage)}%`}</Typography>
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell align="right">
                                  <StatusChip status={task.status} />
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" color="text.secondary">
                                    {new Date(task.lastUpdate).toLocaleString()}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </ProgressRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
};

export default ProgressDashboard;
