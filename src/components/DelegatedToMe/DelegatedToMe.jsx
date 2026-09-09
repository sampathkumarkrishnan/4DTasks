import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Collapse,
  alpha,
  CircularProgress,
} from '@mui/material';
import InboxIcon from '@mui/icons-material/Inbox';
import AddTaskIcon from '@mui/icons-material/AddTask';
import CancelIcon from '@mui/icons-material/Cancel';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useAuth } from '../../context/AuthContext';
import { useTasks } from '../../context/TaskContext';
import { delegationsApi } from '../../services/delegationsApi';
import { useThemeMode } from '../../context/ThemeContext';
import { getQuadrantConfig } from '../../theme/theme';
import { resolveTimeHorizonColor } from '../../utils/resolveTimeHorizon';

export default function DelegatedToMe() {
  const { accessToken } = useAuth();
  const { acceptDelegation, declineDelegation, fetchTasks, getDelegationInbox } = useTasks();
  const { mode } = useThemeMode();
  const config = getQuadrantConfig(mode).do;
  const [inbox, setInbox] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const [actingId, setActingId] = useState(null);

  const loadInbox = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const list = await getDelegationInbox();
      setInbox(Array.isArray(list) ? list : []);
    } catch (e) {
      console.warn('Failed to load delegated to me:', e);
      setInbox([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, getDelegationInbox]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  const handleAdd = async (d) => {
    setActingId(d.id);
    try {
      await acceptDelegation(d);
      setInbox((prev) => prev.filter((x) => x.id !== d.id));
      await fetchTasks();
    } catch (e) {
      console.error('Accept delegation failed:', e);
    } finally {
      setActingId(null);
    }
  };

  const handleDecline = async (d) => {
    setActingId(d.id);
    try {
      await declineDelegation(d.id);
      setInbox((prev) => prev.filter((x) => x.id !== d.id));
    } catch (e) {
      console.error('Decline delegation failed:', e);
    } finally {
      setActingId(null);
    }
  };

  const title = loading ? 'Delegated to me...' : `Delegated to me (${inbox.length})`;

  return (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: (theme) => alpha(config.color, 0.08),
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          cursor: 'pointer',
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <InboxIcon fontSize="small" sx={{ color: config.color }} />
          <Typography variant="subtitle2" fontWeight={600}>
            {title}
          </Typography>
          {loading && <CircularProgress size={16} />}
        </Box>
        {open ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </Box>
      <Collapse in={open}>
        <List dense sx={{ pt: 0, pb: 1 }}>
          {inbox.length === 0 && !loading && (
            <ListItem>
              <ListItemText
                primary="No pending delegations"
                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
              />
            </ListItem>
          )}
          {inbox.map((d) => {
            const payload = d.taskPayload || {};
            const label = payload.title || 'Untitled';
            const due = payload.due ? new Date(payload.due).toLocaleDateString() : null;
            const secondary = [d.fromUserEmail, due].filter(Boolean).join(' · ');
            const busy = actingId === d.id;
            const horizonColor = resolveTimeHorizonColor(payload);
            return (
              <ListItem
                key={d.id}
                sx={{
                  borderLeft: 3,
                  borderColor: alpha(horizonColor, 0.7),
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  mb: 0.5,
                  mx: 1,
                }}
              >
                <ListItemText
                  primary={label}
                  secondary={secondary}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
                <ListItemSecondaryAction>
                  <Button
                    size="small"
                    startIcon={busy ? <CircularProgress size={14} /> : <AddTaskIcon />}
                    onClick={() => handleAdd(d)}
                    disabled={busy}
                    sx={{ mr: 0.5 }}
                  >
                    Add to my tasks
                  </Button>
                  <IconButton
                    size="small"
                    onClick={() => handleDecline(d)}
                    disabled={busy}
                    aria-label="Decline"
                  >
                    <CancelIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      </Collapse>
    </Box>
  );
}
