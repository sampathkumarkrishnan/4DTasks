import React, { useState } from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, Avatar, Menu, MenuItem, alpha, Snackbar, Alert, Tooltip, useTheme, useMediaQuery, Button, ToggleButton, ToggleButtonGroup } from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import InventoryIcon from '@mui/icons-material/Inventory';
import LogoutIcon from '@mui/icons-material/Logout';
import RefreshIcon from '@mui/icons-material/Refresh';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { DndContext, DragOverlay, pointerWithin, rectIntersection, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { useAuth } from '../../context/AuthContext';
import { useTasks } from '../../context/TaskContext';
import { delegationsApi, getDelegationIdFromNotes } from '../../services/delegationsApi';
import { useThemeMode } from '../../context/ThemeContext';
import Quadrant from '../Quadrant/Quadrant';
import TaskCard from '../TaskCard/TaskCard';
import TaskDialog from '../TaskDialog/TaskDialog';
import MoveDialog from '../TaskDialog/MoveDialog';
import DelegatedToMe from '../DelegatedToMe/DelegatedToMe';
import Backlog from '../Backlog/Backlog';
import ScheduleDialog from '../TaskDialog/ScheduleDialog';
import SplitDialog from '../TaskDialog/SplitDialog';
import { getQuadrantConfig } from '../../theme/theme';
import { resolveTimeHorizon } from '../../utils/resolveTimeHorizon';

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
  const { user, logout, needsReauth, login, accessToken } = useAuth();
  const { tasks, moveTask, fetchTasks, error, isLoading, createDelegation, getBacklogTasksByHorizon, getGuardrailWarnings, scheduleTask, splitTask } = useTasks();
  
  // Detect mobile screens (less than 768px)
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
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
  const [view, setView] = useState('execute');
  const [taskDialog, setTaskDialog] = useState({ open: false, quadrant: null, task: null, captureMode: 'matrix', timeHorizon: null });
  const [scheduleDialog, setScheduleDialog] = useState({ open: false, task: null });
  const [splitDialog, setSplitDialog] = useState({ open: false, task: null });
  const [moveDialog, setMoveDialog] = useState({ open: false, task: null, targetQuadrant: null });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const guardrailWarnings = getGuardrailWarnings();
  const q1Warning = guardrailWarnings.find((w) => w.id === 'q1-overflow')?.message;
  const q2Warning = guardrailWarnings.find((w) => w.id === 'q2-composition')?.message;

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

    const currentQuadrant = task.metadata?.quadrant;
    if (!currentQuadrant) return;
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

  const handleOpenTaskDialog = (quadrant, task = null, options = {}) => {
    setTaskDialog({
      open: true,
      quadrant,
      task,
      captureMode: options.captureMode || 'matrix',
      timeHorizon: options.timeHorizon || null,
    });
  };

  const handleOpenBacklogTask = (timeHorizon) => {
    handleOpenTaskDialog(null, null, { captureMode: 'backlog', timeHorizon });
  };

  const handleEditBacklogTask = (task) => {
    handleOpenTaskDialog(null, task, { captureMode: 'backlog' });
  };

  const handleCloseTaskDialog = () => {
    setTaskDialog({ open: false, quadrant: null, task: null, captureMode: 'matrix', timeHorizon: null });
  };

  const handleSchedule = (task) => {
    setScheduleDialog({ open: true, task });
  };

  const handleScheduleConfirm = async (data) => {
    const { task } = scheduleDialog;
    try {
      await scheduleTask(task.id, data);
      setSnackbar({ open: true, message: 'Task scheduled', severity: 'success' });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to schedule', severity: 'error' });
    }
    setScheduleDialog({ open: false, task: null });
  };

  const handleSplit = (task) => {
    setSplitDialog({ open: true, task });
  };

  const handleSplitConfirm = async (childTitles) => {
    const { task } = splitDialog;
    try {
      const created = await splitTask(task, childTitles);
      setSnackbar({
        open: true,
        message: `Created ${created.length} tactical task${created.length !== 1 ? 's' : ''}`,
        severity: 'success',
      });
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Failed to split', severity: 'error' });
    }
    setSplitDialog({ open: false, task: null });
  };

  const handleCloseMoveDialog = () => {
    setMoveDialog({ open: false, task: null, targetQuadrant: null });
  };

  const handleMoveConfirm = async (additionalData) => {
    const { task, targetQuadrant } = moveDialog;
    try {
      await moveTask(task.id, targetQuadrant, additionalData);
      if (targetQuadrant === 'delegate' && additionalData.delegatedTo && accessToken) {
        try {
          const taskPayload = {
            title: task.cleanTitle || task.title || 'Untitled',
            notes: task.displayNotes || task.notes || '',
            due: task.due || null,
            listTitle: task.listTitle || null,
            timeHorizon: resolveTimeHorizon(task).id,
          };
          const sourceDelegationId = getDelegationIdFromNotes(task.notes);
          await createDelegation({
            taskPayload,
            toEmail: additionalData.delegatedTo,
            sourceListId: task.listId,
            sourceTaskId: task.id,
            ...(sourceDelegationId && { sourceDelegationId }),
          });
          setSnackbar({
            open: true,
            message: `Invitation sent to ${additionalData.delegatedTo}`,
            severity: 'success',
          });
        } catch (delegErr) {
          const msg = delegErr?.status === 400
            ? (delegErr?.message || 'Cannot delegate to that person (would create a cycle).')
            : `Failed to send invitation: ${delegErr?.message || 'Unknown error'}`;
          setSnackbar({ open: true, message: msg, severity: 'error' });
        }
      } else {
        setSnackbar({
          open: true,
          message: `Task moved to ${quadrantConfig[targetQuadrant].title}`,
          severity: 'success',
        });
      }
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
          <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mr: 2 }}>
            4D Matrix
          </Typography>

          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={(_, newView) => newView && setView(newView)}
            size="small"
            sx={{ mr: 'auto' }}
          >
            <ToggleButton value="execute">
              <ViewKanbanIcon sx={{ fontSize: 18, mr: 0.75 }} />
              Execute
            </ToggleButton>
            <ToggleButton value="backlog">
              <InventoryIcon sx={{ fontSize: 18, mr: 0.75 }} />
              Backlog
            </ToggleButton>
          </ToggleButtonGroup>
          
          <Box sx={{ flexGrow: 1 }} />
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

      {/* Re-auth Banner */}
      {needsReauth && (
        <Alert 
          severity="warning" 
          sx={{ 
            borderRadius: 0,
            '& .MuiAlert-action': { alignItems: 'center' }
          }}
          action={
            <Button color="inherit" size="small" onClick={login} sx={{ fontWeight: 600 }}>
              Sign in
            </Button>
          }
        >
          Your session has expired. Click to sign in again.
        </Alert>
      )}

      {/* Main Content */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <DelegatedToMe />
        {view === 'backlog' ? (
          <Backlog
            getBacklogTasksByHorizon={getBacklogTasksByHorizon}
            onAddTask={handleOpenBacklogTask}
            onEditTask={handleEditBacklogTask}
            onSchedule={handleSchedule}
            onSplit={handleSplit}
          />
        ) : isMobile ? (
          /* Mobile Layout - Vertical Stack */
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <Box sx={{ minHeight: '40vh' }}>
              <Quadrant
                config={quadrantConfig.do}
                onAddTask={() => handleOpenTaskDialog('do')}
                onEditTask={(task) => handleOpenTaskDialog('do', task)}
                guardrailWarning={q1Warning}
              />
            </Box>
            <Box sx={{ minHeight: '40vh' }}>
              <Quadrant
                config={quadrantConfig.delegate}
                onAddTask={() => handleOpenTaskDialog('delegate')}
                onEditTask={(task) => handleOpenTaskDialog('delegate', task)}
              />
            </Box>
            <Box sx={{ minHeight: '40vh' }}>
              <Quadrant
                config={quadrantConfig.delay}
                onAddTask={() => handleOpenTaskDialog('delay')}
                onEditTask={(task) => handleOpenTaskDialog('delay', task)}
                guardrailWarning={q2Warning}
              />
            </Box>
            <Box sx={{ minHeight: '40vh' }}>
              <Quadrant
                config={quadrantConfig.delete}
                onAddTask={() => handleOpenTaskDialog('delete')}
                onEditTask={(task) => handleOpenTaskDialog('delete', task)}
              />
            </Box>
          </Box>
        ) : (
          /* Desktop Layout - Resizable 2x2 Grid */
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
                      guardrailWarning={q1Warning}
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
                      guardrailWarning={q2Warning}
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
        )}

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Create/Edit Dialog */}
      <TaskDialog
        open={taskDialog.open}
        onClose={handleCloseTaskDialog}
        quadrant={taskDialog.quadrant}
        task={taskDialog.task}
        captureMode={taskDialog.captureMode}
        timeHorizon={taskDialog.timeHorizon}
        onSuccess={(message) => {
          setSnackbar({ open: true, message, severity: 'success' });
        }}
      />

      <ScheduleDialog
        open={scheduleDialog.open}
        onClose={() => setScheduleDialog({ open: false, task: null })}
        task={scheduleDialog.task}
        onConfirm={handleScheduleConfirm}
      />

      <SplitDialog
        open={splitDialog.open}
        onClose={() => setSplitDialog({ open: false, task: null })}
        task={splitDialog.task}
        onConfirm={handleSplitConfirm}
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
