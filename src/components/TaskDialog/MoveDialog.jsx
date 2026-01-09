import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  alpha,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useThemeMode } from '../../context/ThemeContext';
import { getQuadrantConfig } from '../../theme/theme';

function MoveDialog({ open, onClose, task, targetQuadrant, onConfirm }) {
  const { mode } = useThemeMode();
  const [due, setDue] = useState(null);
  const [delegatedTo, setDelegatedTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const quadrantConfig = getQuadrantConfig(mode);

  useEffect(() => {
    if (open) {
      // Pre-fill with existing values if available
      setDue(task?.due ? dayjs(task.due) : null);
      setDelegatedTo(task?.metadata?.delegatedTo || '');
    }
  }, [open, task]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const additionalData = {};

      if (targetQuadrant === 'do' || targetQuadrant === 'delay' || targetQuadrant === 'delegate') {
        additionalData.due = due ? due.format('YYYY-MM-DD') + 'T12:00:00.000Z' : null;
      }

      if (targetQuadrant === 'delegate') {
        additionalData.delegatedTo = delegatedTo || null;
      }

      await onConfirm(additionalData);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!targetQuadrant) return null;

  const config = quadrantConfig[targetQuadrant];
  const showDatePicker = targetQuadrant === 'do' || targetQuadrant === 'delay' || targetQuadrant === 'delegate';
  const showDelegateField = targetQuadrant === 'delegate';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
          Move to {config.title}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Box
            sx={{
              p: 2,
              borderRadius: 1.5,
              bgcolor: alpha(config.color, 0.15),
              border: `1px solid ${alpha(config.color, 0.3)}`,
              mb: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Moving task:
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500, mt: 0.5 }}>
              {task?.title}
            </Typography>
          </Box>

          {showDatePicker && (
            <DatePicker
              label={targetQuadrant === 'do' ? 'Due date' : 'Schedule for'}
              value={due}
              onChange={setDue}
              slotProps={{
                textField: {
                  fullWidth: true,
                  helperText: targetQuadrant === 'delay'
                    ? 'When should this task be scheduled for?'
                    : 'When is this task due?',
                },
              }}
            />
          )}

          {showDelegateField && (
            <TextField
              label="Delegate to (email)"
              type="email"
              value={delegatedTo}
              onChange={(e) => setDelegatedTo(e.target.value)}
              fullWidth
              placeholder="colleague@example.com"
              helperText="Enter the email of the person to delegate this task to"
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting}
          sx={{
            bgcolor: config.color,
            '&:hover': {
              bgcolor: alpha(config.color, 0.8),
            },
          }}
        >
          {isSubmitting ? 'Moving...' : `Move to ${config.title}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default MoveDialog;
