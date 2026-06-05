import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Inbox, Loader2, MessageSquare, RefreshCw } from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import { supabase } from '../lib/supabase';

const appleEase = [0.16, 1, 0.3, 1];

const statuses = ['open', 'in_review', 'resolved', 'closed'] as const;
type TicketStatus = typeof statuses[number];

type Ticket = {
  id: string;
  creator_id: string;
  issue_type: string;
  description: string;
  status: TicketStatus;
  admin_note?: string | null;
  created_at: string;
  creator_profile?: {
    x_handle?: string | null;
    full_name?: string | null;
  } | null;
};

function statusLabel(status: string) {
  return status.replace('_', ' ');
}

function statusClass(status: string) {
  switch (status) {
    case 'open':
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    case 'in_review':
      return 'bg-cyan/10 text-cyan border-cyan/20';
    case 'resolved':
      return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'closed':
      return 'bg-white/5 text-muted border-white/10';
    default:
      return 'bg-white/5 text-muted border-white/10';
  }
}

export default function AdminTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<'all' | TicketStatus>('open');

  const loadTickets = async () => {
    if (!supabase) return;
    try {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await supabase
        .from('support_tickets')
        .select(`
          *,
          creator_profile:creator_profiles!support_tickets_creator_id_fkey (
            x_handle,
            full_name
          )
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTickets((data || []) as Ticket[]);
    } catch (error) {
      console.error('Error loading support tickets:', error);
      setLoadError('Unable to load tickets.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    if (activeStatus === 'all') return tickets;
    return tickets.filter((ticket) => ticket.status === activeStatus);
  }, [activeStatus, tickets]);

  const updateTicket = async (ticketId: string, payload: Partial<Pick<Ticket, 'status' | 'admin_note'>>) => {
    if (!supabase) return;
    try {
      setSavingId(ticketId);
      const { error } = await supabase
        .from('support_tickets')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', ticketId);
      if (error) throw error;
      setTickets((current) => current.map((ticket) => (
        ticket.id === ticketId ? { ...ticket, ...payload } : ticket
      )));
    } catch (error) {
      console.error('Error updating support ticket:', error);
      alert('Failed to update ticket');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A1E] text-[#F5F5F7] font-sans selection:bg-purple-500/30 flex">
      <AdminSidebar />

      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: appleEase }}
                className="text-3xl font-semibold tracking-tight text-white flex items-center gap-3"
              >
                <Inbox className="w-8 h-8 text-purple-400" /> Tickets
              </motion.h1>
              <p className="text-muted mt-2">Review creator reports and support issues.</p>
            </div>
            <button
              onClick={loadTickets}
              className="px-4 py-2.5 rounded-xl bg-white/10 text-white border border-white/10 hover:bg-white/15 transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', ...statuses] as const).map((status) => (
              <button
                key={status}
                onClick={() => setActiveStatus(status)}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors capitalize ${
                  activeStatus === status
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : 'bg-white/5 text-muted border-white/10 hover:text-white'
                }`}
              >
                {statusLabel(status)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="glass-panel rounded-[2rem] p-12 border border-white/10 text-center text-muted">
              <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-4" />
              Loading tickets...
            </div>
          ) : loadError ? (
            <div className="glass-panel rounded-[2rem] p-12 border border-red-500/20 bg-red-500/5 text-center text-red-400">
              {loadError}
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="glass-panel rounded-[2rem] p-12 border border-white/10 text-center text-muted">
              No tickets found.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => {
                const creatorName = ticket.creator_profile?.x_handle || ticket.creator_profile?.full_name || ticket.creator_id;
                return (
                  <div key={ticket.id} className="glass-panel rounded-2xl p-6 border border-white/10">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span className={`px-2.5 py-1 rounded-md border text-xs font-semibold capitalize ${statusClass(ticket.status)}`}>
                            {statusLabel(ticket.status)}
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-xs font-semibold text-muted capitalize">
                            {ticket.issue_type}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-white">@{creatorName}</h3>
                        <p className="text-xs text-muted">{new Date(ticket.created_at).toLocaleString()}</p>
                      </div>
                      <select
                        value={ticket.status}
                        disabled={savingId === ticket.id}
                        onChange={(event) => updateTicket(ticket.id, { status: event.target.value as TicketStatus })}
                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-purple-500/50 capitalize"
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status} className="bg-[#0A0A1E]">
                            {statusLabel(status)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-white/90 leading-relaxed mb-4">
                      {ticket.description}
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-2 text-sm font-medium text-muted">
                        <MessageSquare className="w-4 h-4" /> Admin note
                      </label>
                      <textarea
                        value={ticket.admin_note || ''}
                        onChange={(event) => {
                          const value = event.target.value;
                          setTickets((current) => current.map((item) => (
                            item.id === ticket.id ? { ...item, admin_note: value } : item
                          )));
                        }}
                        onBlur={(event) => updateTicket(ticket.id, { admin_note: event.target.value })}
                        placeholder="Add internal notes..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500/50 transition-colors resize-none h-24"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
