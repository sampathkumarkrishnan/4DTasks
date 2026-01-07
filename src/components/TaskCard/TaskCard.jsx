import React, { useState } from 'react';
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
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import LabelIcon from '@mui/icons-material/Label';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useTasks } from '../../context/TaskContext';

dayjs.extend(relativeTime);

function TaskCard({ task, onEdit, quadrantColor, isDragging = false }) {
  const { toggleComplete, deleteTask } = useTasks();
  const [menuAnchor, setMenuAnchor] = useState(null);

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
  const dueDate = task.due ? dayjs(task.due) : null;
  const isOverdue = dueDate && dueDate.isBefore(dayjs(), 'day') && !isCompleted;

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
    toggleComplete(task.id);
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

  const handleCardClick = (event) => {
    // Only trigger if it's a simple click (not a drag)
    // The drag library handles preventing click during drag
    onEdit?.();
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
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleCardClick}
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        opacity: isCompleted ? 0.6 : 1,
        '&:hover': {
          bgcolor: 'action.hover',
          borderColor: alpha(quadrantColor || '#6B8F71', 0.4),
          '& .task-actions': {
            opacity: 1,
          },
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
        <Checkbox
          checked={isCompleted}
          onChange={handleToggleComplete}
          onPointerDown={stopDragPropagation}
          onMouseDown={stopDragPropagation}
          onTouchStart={stopDragPropagation}
          size="small"
          sx={{
            p: 0.5,
            color: 'action.disabled',
            '&.Mui-checked': {
              color: 'primary.main',
            },
          }}
        />
        
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              textDecoration: isCompleted ? 'line-through' : 'none',
              color: isCompleted ? 'text.disabled' : 'text.primary',
              wordBreak: 'break-word',
            }}
          >
            {task.cleanTitle || task.title}
          </Typography>

          {/* Meta info row */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 0.75,
              mt: 0.75,
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
            sx={{ p: 0.5 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

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
  );
}

export default TaskCard;

