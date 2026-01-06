import React from 'react';
import { Box, Typography, IconButton, alpha, Tooltip, Badge } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PeopleIcon from '@mui/icons-material/People';
import ScheduleIcon from '@mui/icons-material/Schedule';
import DeleteIcon from '@mui/icons-material/Delete';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTasks } from '../../context/TaskContext';
import TaskCard from '../TaskCard/TaskCard';

const iconMap = {
  PlayArrow: PlayArrowIcon,
  People: PeopleIcon,
  Schedule: ScheduleIcon,
  Delete: DeleteIcon,
};

function Quadrant({ config, onAddTask, onEditTask }) {
  const { getTasksByQuadrant, toggleShowCompleted, showCompleted, tasks } = useTasks();
  
  const { setNodeRef, isOver } = useDroppable({
    id: config.id,
  });

  const quadrantTasks = getTasksByQuadrant(config.id);
  const activeTasks = quadrantTasks.filter((t) => t.status !== 'completed');
  const completedTasks = quadrantTasks.filter((t) => t.status === 'completed');
  const allQuadrantTasks = tasks.filter((t) => (t.metadata?.quadrant || 'do') === config.id);
  const completedCount = allQuadrantTasks.filter((t) => t.status === 'completed').length;

  const IconComponent = iconMap[config.icon] || PlayArrowIcon;

  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: alpha(config.color, 0.08),
        borderRight: '1px solid',
        borderBottom: '1px solid',
        borderColor: 'divider',
        transition: 'background-color 0.2s ease',
        ...(isOver && {
          bgcolor: alpha(config.color, 0.2),
        }),
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(config.color, 0.15),
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              bgcolor: alpha(config.color, 0.4),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconComponent sx={{ fontSize: 20, color: 'text.primary' }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, lineHeight: 1.2 }}>
              {config.title}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {config.subtitle}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {completedCount > 0 && (
            <Tooltip title={showCompleted[config.id] ? 'Hide completed' : 'Show completed'}>
              <IconButton
                size="small"
                onClick={() => toggleShowCompleted(config.id)}
                sx={{ color: 'text.secondary' }}
              >
                <Badge badgeContent={completedCount} color="primary" max={99}>
                  {showCompleted[config.id] ? (
                    <VisibilityOffIcon fontSize="small" />
                  ) : (
                    <VisibilityIcon fontSize="small" />
                  )}
                </Badge>
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Add task">
            <IconButton
              size="small"
              onClick={onAddTask}
              sx={{
                bgcolor: alpha(config.color, 0.3),
                '&:hover': {
                  bgcolor: alpha(config.color, 0.5),
                },
              }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Task List */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 1.5,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <SortableContext
          items={quadrantTasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {activeTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={() => onEditTask(task)}
              quadrantColor={config.color}
            />
          ))}
          
          {showCompleted[config.id] && completedTasks.length > 0 && (
            <>
              <Typography
                variant="caption"
                color="text.disabled"
                sx={{ mt: 1, mb: 0.5, px: 1 }}
              >
                Completed ({completedTasks.length})
              </Typography>
              {completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={() => onEditTask(task)}
                  quadrantColor={config.color}
                />
              ))}
            </>
          )}
        </SortableContext>

        {quadrantTasks.length === 0 && (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 100,
            }}
          >
            <Typography
              variant="body2"
              color="text.disabled"
              sx={{ textAlign: 'center' }}
            >
              {config.description}
              <br />
              <Typography
                component="span"
                variant="caption"
                color="text.disabled"
              >
                Click + or drag tasks here
              </Typography>
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default Quadrant;

