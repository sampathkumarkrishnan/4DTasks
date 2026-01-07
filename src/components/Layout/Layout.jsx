import React, { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Avatar, Menu, MenuItem, alpha, Snackbar, Alert, Tooltip, useTheme } from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { DndContext, DragOverlay, pointerWithin, rectIntersection, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { useAuth } from '../../context/AuthContext';
import { useTasks } from '../../context/TaskContext';
import { useThemeMode } from '../../context/ThemeContext';
import Quadrant from '../Quadrant/Quadrant';
import TaskCard from '../TaskCard/TaskCard';
import TaskDialog from '../TaskDialog/TaskDialog';
import MoveDialog from '../TaskDialog/MoveDialog';
import { getQuadrantConfig } from '../../theme/theme';

// Resize handle component
function ResizeHandle({ direction = 'horizontal' }) {
  const theme = useTheme();
  const isHorizontal = direction === 'horizontal';
  
  return (
    <PanelResizeHandle
      style={{
        width: isHorizontal ? '6px' : '100%',
        height: isHorizontal ? '100%' : '6px',
        background: alpha(theme.palette.divider, 0.5),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isHorizontal ? 'col-resize' : 'row-resize',
        transition: 'background 0.2s ease',
      }}
      className="resize-handle"
    >
      <Box
        sx={{
          width: isHorizontal ? 2 : 24,
          height: isHorizontal ? 24 : 2,
          borderRadius: 1,
          bgcolor: alpha(theme.palette.text.secondary, 0.3),
          '.resize-handle:hover &': {
            bgcolor: 'primary.main',
          },
        }}
      />
    </PanelResizeHandle>
  );
}

function Layout() {
  const theme = useTheme();
  const { mode, toggleTheme, isDark } = useThemeMode();
  const { user, logout } = useAuth();
  const { tasks, moveTask, fetchTasks, error, isLoading } = useTasks();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [activeTask, setActiveTask] = useState(null);

  // Configure sensors with activation constraint - requires 5px movement before drag starts
  // This allows clicks to work without triggering drag
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 5,
    },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 150,
      tolerance: 5,
    },
  });
  const sensors = useSensors(mouseSensor, touchSensor);
  const [taskDialog, setTaskDialog] = useState({ open: false, quadrant: null, task: null });
  const [moveDialog, setMoveDialog] = useState({ open: false, task: null, targetQuadrant: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Get quadrant config based on current theme mode
  const quadrantConfig = getQuadrantConfig(mode);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = () => {
    handleMenuClose();
    logout();
  };

  const handleRefresh = () => {
    fetchTasks();
  };

  // Drag and drop handlers
  const handleDragStart = (event) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Check if over.id is a quadrant or a task
    const validQuadrants = ['do', 'delegate', 'delay', 'delete'];
    let targetQuadrant = over.id;
    
    // If dropped on a task card, find that task's quadrant
    if (!validQuadrants.includes(over.id)) {
      const targetTask = tasks.find((t) => t.id === over.id);
      if (targetTask) {
        targetQuadrant = targetTask.metadata?.quadrant || 'do';
      } else {
        // Unknown drop target, ignore
        return;
      }
    }

    const currentQuadrant = task.metadata?.quadrant || 'do';

    if (currentQuadrant === targetQuadrant) return;

    // For do/delay quadrants, show date picker
    // For delegate quadrant, show email input
    if (targetQuadrant === 'do' || targetQuadrant === 'delay' || targetQuadrant === 'delegate') {
      setMoveDialog({
        open: true,
        task,
        targetQuadrant,
      });
    } else {
      // For delete quadrant, just move
      moveTask(taskId, targetQuadrant)
        .then(() => {
          setSnackbar({
            open: true,
            message: `Task moved to ${quadrantConfig[targetQuadrant].title}`,
            severity: 'success',
          });
        })
        .catch((error) => {
          console.error('Move task failed:', error);
          setSnackbar({
            open: true,
            message: `Failed to move task: ${error?.message || 'Unknown error'}`,
            severity: 'error',
          });
        });
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
  };

  // Custom collision detection for quadrants
  const collisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    return rectIntersection(args);
  };

  const handleOpenTaskDialog = (quadrant, task = null) => {
    setTaskDialog({ open: true, quadrant, task });
  };

  const handleCloseTaskDialog = () => {
    setTaskDialog({ open: false, quadrant: null, task: null });
  };

  const handleCloseMoveDialog = () => {
    setMoveDialog({ open: false, task: null, targetQuadrant: null });
  };

  const handleMoveConfirm = async (additionalData) => {
    const { task, targetQuadrant } = moveDialog;
    try {
      await moveTask(task.id, targetQuadrant, additionalData);
      setSnackbar({
        open: true,
        message: `Task moved to ${quadrantConfig[targetQuadrant].title}`,
        severity: 'success',
      });
    } catch (error) {
      console.error('Move task failed:', error);
      setSnackbar({
        open: true,
        message: `Failed to move task: ${error?.message || 'Unknown error'}`,
        severity: 'error',
      });
    }
    handleCloseMoveDialog();
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh', 
      bgcolor: 'background.default',
      // Global grabbing cursor during drag
      ...(activeTask && {
        cursor: 'grabbing',
        '& *': {
          cursor: 'grabbing !important',
        },
      }),
    }}>
      {/* App Bar */}
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: 'background.paper',
          borderBottom: `1px solid`,
          borderColor: 'divider',
        }}
      >
        <Toolbar>
          <GridViewIcon sx={{ mr: 1.5, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600, color: 'text.primary' }}>
            4D Matrix
          </Typography>
          
          <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton onClick={toggleTheme} sx={{ mr: 0.5 }}>
              {isDark ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Refresh tasks">
            <IconButton
              onClick={handleRefresh}
              disabled={isLoading}
              sx={{ mr: 1 }}
            >
              <RefreshIcon
                sx={{
                  animation: isLoading ? 'spin 1s linear infinite' : 'none',
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                  },
                }}
              />
            </IconButton>
          </Tooltip>

          <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
            <Avatar
              src={user?.picture}
              alt={user?.name}
              sx={{ width: 32, height: 32 }}
            >
              {user?.name?.[0]}
            </Avatar>
          </IconButton>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem disabled>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
              Sign out
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Main Content - Resizable 2x2 Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <PanelGroup orientation="vertical" style={{ height: '100%' }}>
            {/* Top Row */}
            <Panel defaultSize="50%" minSize="20%">
              <PanelGroup orientation="horizontal" style={{ height: '100%' }}>
                <Panel defaultSize="50%" minSize="20%">
                  <Quadrant
                    config={quadrantConfig.do}
                    onAddTask={() => handleOpenTaskDialog('do')}
                    onEditTask={(task) => handleOpenTaskDialog('do', task)}
                  />
                </Panel>
                <ResizeHandle direction="horizontal" />
                <Panel defaultSize="50%" minSize="20%">
                  <Quadrant
                    config={quadrantConfig.delegate}
                    onAddTask={() => handleOpenTaskDialog('delegate')}
                    onEditTask={(task) => handleOpenTaskDialog('delegate', task)}
                  />
                </Panel>
              </PanelGroup>
            </Panel>

            <ResizeHandle direction="vertical" />

            {/* Bottom Row */}
            <Panel defaultSize="50%" minSize="20%">
              <PanelGroup orientation="horizontal" style={{ height: '100%' }}>
                <Panel defaultSize="50%" minSize="20%">
                  <Quadrant
                    config={quadrantConfig.delay}
                    onAddTask={() => handleOpenTaskDialog('delay')}
                    onEditTask={(task) => handleOpenTaskDialog('delay', task)}
                  />
                </Panel>
                <ResizeHandle direction="horizontal" />
                <Panel defaultSize="50%" minSize="20%">
                  <Quadrant
                    config={quadrantConfig.delete}
                    onAddTask={() => handleOpenTaskDialog('delete')}
                    onEditTask={(task) => handleOpenTaskDialog('delete', task)}
                  />
                </Panel>
              </PanelGroup>
            </Panel>
          </PanelGroup>
        </Box>

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} isDragging quadrantColor={quadrantConfig[activeTask.metadata?.quadrant || 'do'].color} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Create/Edit Dialog */}
      <TaskDialog
        open={taskDialog.open}
        onClose={handleCloseTaskDialog}
        quadrant={taskDialog.quadrant}
        task={taskDialog.task}
        onSuccess={(message) => {
          setSnackbar({ open: true, message, severity: 'success' });
        }}
      />

      {/* Move Task Dialog */}
      <MoveDialog
        open={moveDialog.open}
        onClose={handleCloseMoveDialog}
        task={moveDialog.task}
        targetQuadrant={moveDialog.targetQuadrant}
        onConfirm={handleMoveConfirm}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Global error display */}
      {error && (
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert severity="error" variant="filled">
            {error}
          </Alert>
        </Snackbar>
      )}
    </Box>
  );
}

export default Layout;
