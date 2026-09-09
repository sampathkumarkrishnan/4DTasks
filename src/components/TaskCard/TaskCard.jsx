import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Checkbox,
  alpha,
  Chip,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  Snackbar,
  Alert,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import LabelIcon from '@mui/icons-material/Label';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { TIME_HORIZON_CONFIG } from '../../constants/timeHorizon';
import { useTasks } from '../../context/TaskContext';
import SubtaskAccordion from '../SubtaskAccordion/SubtaskAccordion';

dayjs.extend(relativeTime);

function TaskCard({ task, onEdit, quadrantColor, isDragging = false }) {
  const { toggleComplete, deleteTask, sentDelegations } = useTasks();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [cascadeFailureCount, setCascadeFailureCount] = useState(0);
  const completeTimerRef = useRef(null);
  const declinedDelegation = sentDelegations?.find(
    (d) => d.sourceListId === task.listId && d.sourceTaskId === task.id && d.status === 'declined'
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isCompleted = task.status === 'completed';
  const showAsCompleted = isCompleted || isCompleting;
  const dueDate = task.due ? dayjs(task.due) : null;
  const isOverdue = dueDate && dueDate.isBefore(dayjs(), 'day') && !showAsCompleted;

  // Subtask progress badge data
  const subtasks = task.subtasks || [];
  const subtaskTotal = subtasks.length;
  const subtaskDone = subtasks.filter((s) => s.status === 'completed').length;
  const subtaskOverdue = subtasks.some(
    (s) => s.status !== 'completed' && s.due && dayjs(s.due).isBefore(dayjs(), 'day')
  );

  useEffect(() => () => {
    if (completeTimerRef.current) {
      window.clearTimeout(completeTimerRef.current);
    }
  }, []);

  // Stop drag events from triggering on interactive elements
  const stopDragPropagation = (event) => {
    event.stopPropagation();
  };

  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleToggleComplete = (event) => {
    event.stopPropagation();
    if (isCompleting) return;

    if (isCompleted) {
      toggleComplete(task.id);
      return;
    }

    // Play animation first, then persist — card stays mounted while isCompleting
    setIsCompleting(true);
    completeTimerRef.current = window.setTimeout(async () => {
      const result = await toggleComplete(task.id);
      setIsCompleting(false);
      if (result?.failureCount > 0) {
        setCascadeFailureCount(result.failureCount);
      }
    }, 480);
  };

  const handleDelete = async (event) => {
    event.stopPropagation();
    event.preventDefault();
    handleMenuClose();
    try {
      await deleteTask(task); // Pass full task object for reliable deletion
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleEdit = (event) => {
    event.stopPropagation();
    event.preventDefault();
    handleMenuClose();
    onEdit?.();
  };

  const handleCardClick = () => {
    onEdit?.();
  };

  const handleToggleExpand = (event) => {
    event.stopPropagation();
    setExpanded((prev) => !prev);
  };

  if (isDragging || isSortableDragging) {
    return (
      <Box
        sx={{
          p: 1.5,
          borderRadius: 1.5,
          bgcolor: alpha(quadrantColor || '#6B8F71', 0.3),
          border: '2px dashed',
          borderColor: 'divider',
          opacity: 0.8,
          boxShadow: 4,
          cursor: 'grabbing',
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {task.cleanTitle || task.title}
        </Typography>
      </Box>
    );
  }

  return (
    <Box ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Box
        sx={{
          p: expanded ? 1.5 : 1,
          borderRadius: 1.5,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderLeftWidth: '3px',
          borderLeftColor: alpha(quadrantColor || '#6B8F71', 0.7),
          cursor: 'pointer',
          transition: 'background-color 0.35s ease, border-color 0.35s ease, opacity 0.35s ease, transform 0.35s ease, box-shadow 0.35s ease, padding 0.2s ease',
          opacity: showAsCompleted ? 0.55 : 1,
          transform: isCompleting ? 'scale(0.96)' : 'scale(1)',
          ...(isCompleting && {
            bgcolor: alpha(quadrantColor || '#2D9172', 0.22),
            borderColor: alpha(quadrantColor || '#2D9172', 0.65),
            boxShadow: `0 0 0 3px ${alpha(quadrantColor || '#2D9172', 0.3)}`,
          }),
          '&:hover': {
            bgcolor: isCompleting ? alpha(quadrantColor || '#2D9172', 0.22) : 'action.hover',
            borderColor: alpha(quadrantColor || '#6B8F71', 0.4),
            '& .task-actions': {
              opacity: 1,
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Checkbox
            checked={showAsCompleted}
            onChange={handleToggleComplete}
            onClick={stopDragPropagation}
            onPointerDown={stopDragPropagation}
            onMouseDown={stopDragPropagation}
            onTouchStart={stopDragPropagation}
            size="small"
            sx={{
              p: 0.5,
              color: 'action.disabled',
              '@keyframes checkPop': {
                '0%': { transform: 'scale(1)' },
                '40%': { transform: 'scale(1.4)' },
                '100%': { transform: 'scale(1)' },
              },
              ...(isCompleting && {
                animation: 'checkPop 0.45s ease',
              }),
              '&.Mui-checked': {
                color: 'primary.main',
              },
              '&:active': {
                transform: 'scale(0.85)',
              },
            }}
          />

          <Typography
            variant="body2"
            onClick={handleCardClick}
            sx={{
              flex: 1,
              minWidth: 0,
              fontWeight: 500,
              textDecoration: showAsCompleted ? 'line-through' : 'none',
              textDecorationColor: showAsCompleted ? alpha(quadrantColor || '#2D9172', 0.5) : 'transparent',
              color: showAsCompleted ? 'text.disabled' : 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: expanded ? 'normal' : 'nowrap',
              wordBreak: expanded ? 'break-word' : 'normal',
              transition: 'color 0.3s ease, text-decoration-color 0.3s ease',
            }}
          >
            {task.cleanTitle || task.title}
          </Typography>

          {/* Subtask progress badge — visible in collapsed and expanded states */}
          {subtaskTotal > 0 && (
            <Tooltip title={`${subtaskDone} of ${subtaskTotal} subtasks complete`}>
              <Chip
                label={`${subtaskDone}/${subtaskTotal}`}
                size="small"
                onClick={(e) => { e.stopPropagation(); }}
                onPointerDown={stopDragPropagation}
                onMouseDown={stopDragPropagation}
                sx={{
                  height: 16,
                  fontSize: '0.65rem',
                  flexShrink: 0,
                  bgcolor: subtaskOverdue ? alpha('#F44336', 0.15) : alpha(quadrantColor || '#6B8F71', 0.15),
                  color: subtaskOverdue ? 'error.main' : 'text.secondary',
                  '& .MuiChip-label': { px: 0.75 },
                  cursor: 'default',
                }}
              />
            </Tooltip>
          )}

          <IconButton
            size="small"
            onClick={handleToggleExpand}
            onPointerDown={stopDragPropagation}
            onMouseDown={stopDragPropagation}
            onTouchStart={stopDragPropagation}
            aria-label={expanded ? 'Collapse task' : 'Expand task'}
            sx={{ p: 0.25, flexShrink: 0 }}
          >
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 1, pl: 4.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 0.75,
                }}
              >
            {dueDate && (
              <Tooltip title={dueDate.format('MMMM D, YYYY')}>
                <Chip
                  icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
                  label={dueDate.format('MMM D')}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    bgcolor: isOverdue ? alpha('#F44336', 0.2) : 'action.selected',
                    color: isOverdue ? '#F44336' : 'text.secondary',
                    '& .MuiChip-icon': {
                      color: 'inherit',
                    },
                  }}
                />
              </Tooltip>
            )}

            {task.metadata?.delegatedTo && (
              <Tooltip title={`Delegated to: ${task.metadata.delegatedTo}`}>
                <Chip
                  icon={<PersonIcon sx={{ fontSize: 14 }} />}
                  label={task.metadata.delegatedTo.split('@')[0]}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    bgcolor: alpha('#4A4A6A', 0.3),
                    maxWidth: 100,
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  }}
                />
              </Tooltip>
            )}

            {declinedDelegation && (
              <Tooltip title={`Declined by ${declinedDelegation.toEmail}${declinedDelegation.declinedAt ? ` on ${new Date(declinedDelegation.declinedAt).toLocaleDateString()}` : ''}`}>
                <Chip
                  label="Declined"
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    bgcolor: alpha('#d32f2f', 0.2),
                    color: '#c62828',
                  }}
                />
              </Tooltip>
            )}

            {task.metadata?.timeHorizon && (
              <Tooltip title={`Horizon: ${TIME_HORIZON_CONFIG[task.metadata.timeHorizon]?.title || task.metadata.timeHorizon}`}>
                <Chip
                  label={TIME_HORIZON_CONFIG[task.metadata.timeHorizon]?.title || task.metadata.timeHorizon}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    bgcolor: alpha(TIME_HORIZON_CONFIG[task.metadata.timeHorizon]?.color || '#888', 0.2),
                  }}
                />
              </Tooltip>
            )}

            {task.listTitle && (
              <Tooltip title={`List: ${task.listTitle}`}>
                <Chip
                  icon={<LabelIcon sx={{ fontSize: 14 }} />}
                  label={task.listTitle}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    bgcolor: alpha('#6B8F71', 0.2),
                    maxWidth: 120,
                    '& .MuiChip-label': {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  }}
                />
              </Tooltip>
            )}
              </Box>

              {task.displayNotes && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    mt: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {task.displayNotes}
                </Typography>
              )}
            </Box>

            <Box
              className="task-actions"
              sx={{
                opacity: 0,
                transition: 'opacity 0.15s ease',
              }}
            >
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                onPointerDown={stopDragPropagation}
                onMouseDown={stopDragPropagation}
                onTouchStart={stopDragPropagation}
                aria-label="Task actions"
                sx={{ p: 0.5 }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Subtask accordion — only visible when card is expanded */}
          <SubtaskAccordion task={task} />
        </Collapse>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" sx={{ color: 'error.main' }} />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      </Box>

      {/* Cascade failure toast — shown when some subtask PATCHes fail (best-effort, ADR 0004) */}
      <Snackbar
        open={cascadeFailureCount > 0}
        autoHideDuration={4000}
        onClose={() => setCascadeFailureCount(0)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="warning"
          onClose={() => setCascadeFailureCount(0)}
          sx={{ width: '100%' }}
        >
          {cascadeFailureCount} subtask{cascadeFailureCount > 1 ? 's' : ''} couldn&apos;t be marked complete
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default TaskCard;

