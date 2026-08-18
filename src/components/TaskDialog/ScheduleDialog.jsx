import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  TextField,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useThemeMode } from '../../context/ThemeContext';
import { getQuadrantConfig } from '../../theme/theme';

function ScheduleDialog({ open, onClose, task, onConfirm }) {
  const { mode } = useThemeMode();
  const quadrantConfig = getQuadrantConfig(mode);
  const [due, setDue] = useState(dayjs());
  const [quadrant, setQuadrant] = useState('delay');
  const [delegatedTo, setDelegatedTo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setDue(task?.due ? dayjs(task.due) : dayjs());
      setQuadrant(task?.metadata?.quadrant || 'delay');
      setDelegatedTo(task?.metadata?.delegatedTo || '');
    }
  }, [open, task]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm({
        due: due ? due.format('YYYY-MM-DD') + 'T12:00:00.000Z' : null,
        quadrant,
        delegatedTo: quadrant === 'delegate' ? delegatedTo : null,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Schedule task</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <DatePicker
            label="Due date"
            value={due}
            onChange={setDue}
            slotProps={{ textField: { fullWidth: true } }}
          />

          <FormControl fullWidth>
            <InputLabel>Quadrant</InputLabel>
            <Select value={quadrant} label="Quadrant" onChange={(e) => setQuadrant(e.target.value)}>
              {Object.entries(quadrantConfig).map(([key, config]) => (
                <MenuItem key={key} value={key}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: config.color }} />
                    {config.title}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {quadrant === 'delegate' && (
            <TextField
              label="Delegate to (email)"
              type="email"
              value={delegatedTo}
              onChange={(e) => setDelegatedTo(e.target.value)}
              fullWidth
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isSubmitting || !due}>
          {isSubmitting ? 'Saving...' : 'Schedule'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ScheduleDialog;
