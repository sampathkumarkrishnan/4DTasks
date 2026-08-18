import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  alpha,
  Tooltip,
  Chip,
  Collapse,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EventIcon from '@mui/icons-material/Event';
import CallSplitIcon from '@mui/icons-material/CallSplit';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LabelIcon from '@mui/icons-material/Label';
import { TIME_HORIZON_CONFIG, TIME_HORIZON_ORDER } from '../../constants/timeHorizon';
import { isScheduledFuture } from '../../utils/taskFilters';
import { useTasks } from '../../context/TaskContext';
import dayjs from 'dayjs';

function BacklogCard({ task, horizonColor, onEdit, onSchedule, onSplit }) {
  const { deleteTask } = useTasks();
  const [expanded, setExpanded] = useState(false);
  const isStrategic = task.metadata?.timeHorizon === 'strategic';
  const scheduled = isScheduledFuture(task);

  const handleDelete = async (e) => {
    e.stopPropagation();
    try {
      await deleteTask(task);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleToggleExpand = (e) => {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  };

  return (
    <Box
      sx={{
        p: expanded ? 1.5 : 1,
        borderRadius: 1.5,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        '&:hover': {
          bgcolor: 'action.hover',
          borderColor: alpha(horizonColor, 0.4),
          '& .backlog-actions': { opacity: 1 },
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography
          variant="body2"
          onClick={onEdit}
          sx={{
            flex: 1,
            minWidth: 0,
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: expanded ? 'normal' : 'nowrap',
            wordBreak: expanded ? 'break-word' : 'normal',
          }}
        >
          {task.cleanTitle || task.title}
        </Typography>
        <IconButton
          size="small"
          onClick={handleToggleExpand}
          aria-label={expanded ? 'Collapse task' : 'Expand task'}
          sx={{ p: 0.25, flexShrink: 0 }}
        >
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ mt: 1 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center' }}>
            {task.listTitle && (
              <Chip
                icon={<LabelIcon sx={{ fontSize: 14 }} />}
                label={task.listTitle}
                size="small"
                sx={{ height: 22, fontSize: '0.7rem', maxWidth: 120 }}
              />
            )}
            {scheduled && (
              <Chip
                icon={<EventIcon sx={{ fontSize: 14 }} />}
                label={dayjs(task.due).format('MMM D')}
                size="small"
                sx={{ height: 22, fontSize: '0.7rem', bgcolor: alpha(horizonColor, 0.15) }}
              />
            )}
          </Box>

          {task.displayNotes && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {task.displayNotes}
            </Typography>
          )}

          <Box
            className="backlog-actions"
            sx={{ display: 'flex', gap: 0.5, mt: 1, opacity: 0.6, transition: 'opacity 0.15s' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip title="Schedule">
              <IconButton size="small" onClick={onSchedule}>
                <EventIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            {isStrategic && (
              <Tooltip title="Split into tactical tasks">
                <IconButton size="small" onClick={onSplit}>
                  <CallSplitIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="Edit">
              <IconButton size="small" onClick={onEdit}>
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" onClick={handleDelete} sx={{ color: 'error.main' }}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

function groupByList(tasks) {
  const groups = {};
  for (const task of tasks) {
    const key = task.listTitle || 'Uncategorized';
    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

function HorizonColumn({ horizonId, tasks, onAddTask, onEditTask, onSchedule, onSplit }) {
  const config = TIME_HORIZON_CONFIG[horizonId];
  const groups = groupByList(tasks);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minWidth: 0,
        bgcolor: alpha(config.color, 0.06),
        borderRight: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: alpha(config.color, 0.12),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 600 }}>
            {config.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {config.subtitle}
          </Typography>
        </Box>
        <Tooltip title={`Add ${config.title} task`}>
          <IconButton
            size="small"
            onClick={onAddTask}
            sx={{ bgcolor: alpha(config.color, 0.2), '&:hover': { bgcolor: alpha(config.color, 0.35) } }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {groups.length === 0 ? (
          <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', mt: 4 }}>
            No tasks yet
          </Typography>
        ) : (
          groups.map(([listName, listTasks]) => (
            <Box key={listName}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', px: 0.5, mb: 0.75, display: 'block' }}
              >
                {listName}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {listTasks.map((task) => (
                  <BacklogCard
                    key={task.id}
                    task={task}
                    horizonColor={config.color}
                    onEdit={() => onEditTask(task)}
                    onSchedule={() => onSchedule(task)}
                    onSplit={() => onSplit(task)}
                  />
                ))}
              </Box>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}

function Backlog({ onAddTask, onEditTask, onSchedule, onSplit, getBacklogTasksByHorizon }) {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' },
        overflow: 'hidden',
        height: '100%',
      }}
    >
      {TIME_HORIZON_ORDER.map((horizonId) => (
        <HorizonColumn
          key={horizonId}
          horizonId={horizonId}
          tasks={getBacklogTasksByHorizon(horizonId)}
          onAddTask={() => onAddTask(horizonId)}
          onEditTask={onEditTask}
          onSchedule={onSchedule}
          onSplit={onSplit}
        />
      ))}
    </Box>
  );
}

export default Backlog;
