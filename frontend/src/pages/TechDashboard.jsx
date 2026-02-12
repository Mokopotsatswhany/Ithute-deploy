import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function TechDashboard() {
  const { user, profile, signOut } = useAuth()
  const [tickets, setTickets] = useState([])
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [filter, setFilter] = useState('all')
  const [techNotes, setTechNotes] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchAllTickets()
  }, [])

  useEffect(() => {
    if (selectedTicket) {
      setTechNotes(selectedTicket.tech_notes || '')
      setNewStatus(selectedTicket.status)
    }
  }, [selectedTicket])

  const fetchAllTickets = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select(`
        *,
        reporter:user_profiles!tickets_reporter_id_fkey(full_name, branch),
        solver:user_profiles!tickets_solved_by_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tickets:', error)
    } else {
      setTickets(data || [])
    }
  }

  const handleUpdateTicket = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const updates = {
        status: newStatus,
        tech_notes: techNotes,
        updated_at: new Date().toISOString(),
      }

      if (newStatus === 'solved' && selectedTicket.status !== 'solved') {
        updates.solved_by_id = user.id
        updates.solved_at = new Date().toISOString()
      } else if (newStatus !== 'solved') {
        updates.solved_by_id = null
        updates.solved_at = null
      }

      const { error } = await supabase
        .from('tickets')
        .update(updates)
        .eq('id', selectedTicket.id)

      if (error) throw error

      setMessage(`Ticket #${selectedTicket.token} updated successfully!`)
      await fetchAllTickets()

      const updatedTicket = tickets.find(t => t.id === selectedTicket.id)
      if (updatedTicket) {
        setSelectedTicket({ ...selectedTicket, ...updates })
      }
    } catch (error) {
      console.error('Error updating ticket:', error)
      setMessage('Error updating ticket. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'solved':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500 text-white'
      case 'HIGH':
        return 'bg-orange-500 text-white'
      case 'MEDIUM':
        return 'bg-yellow-500 text-white'
      case 'LOW':
        return 'bg-green-500 text-white'
      default:
        return 'bg-gray-500 text-white'
    }
  }

  const filteredTickets = tickets.filter((ticket) => {
    if (filter === 'all') return true
    return ticket.status === filter
  })

  const stats = {
    total: tickets.length,
    pending: tickets.filter((t) => t.status === 'pending').length,
    in_progress: tickets.filter((t) => t.status === 'in_progress').length,
    solved: tickets.filter((t) => t.status === 'solved').length,
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Tech Dashboard</h1>
                <p className="text-sm text-gray-600">{profile?.full_name} - {profile?.branch}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Tickets</p>
                <p className="text-3xl font-bold text-gray-800 mt-1">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 mt-1">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">In Progress</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.in_progress}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Solved</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.solved}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex space-x-2 bg-white rounded-lg p-1 shadow inline-flex">
            {['all', 'pending', 'in_progress', 'solved'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-md font-medium text-sm transition ${
                  filter === f
                    ? 'bg-slate-700 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {f === 'all' ? 'All' : f.replace('_', ' ').charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Tickets ({filteredTickets.length})
            </h2>

            <div className="space-y-3 max-h-[700px] overflow-y-auto">
              {filteredTickets.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No tickets found</p>
              ) : (
                filteredTickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition hover:shadow-md ${
                      selectedTicket?.id === ticket.id
                        ? 'border-slate-700 bg-slate-50'
                        : 'border-gray-200 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-gray-800">#{ticket.token}</h4>
                        <p className="text-xs text-gray-500">
                          {ticket.reporter?.full_name} - {ticket.reporter?.branch}
                        </p>
                      </div>
                      <div className="flex flex-col items-end space-y-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getSeverityColor(ticket.severity)}`}>
                          {ticket.severity}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(ticket.status)}`}>
                          {ticket.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{ticket.description}</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500 font-medium">{ticket.ai_classification}</span>
                      <span className="text-gray-400">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            {selectedTicket ? (
              <>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">#{selectedTicket.token}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedTicket.reporter?.full_name} - {selectedTicket.reporter?.branch}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(selectedTicket.severity)}`}>
                      {selectedTicket.severity}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedTicket.status)}`}>
                      {selectedTicket.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                {message && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                    {message}
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Problem Description</h3>
                  <p className="text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedTicket.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Classification:</span>
                    <span className="font-semibold text-gray-800">{selectedTicket.ai_classification}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-2">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-semibold text-gray-800">
                      {new Date(selectedTicket.created_at).toLocaleString()}
                    </span>
                  </div>
                  {selectedTicket.solved_at && (
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-600">Solved:</span>
                      <span className="font-semibold text-gray-800">
                        {new Date(selectedTicket.solved_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleUpdateTicket} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="solved">Solved</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tech Notes
                    </label>
                    <textarea
                      value={techNotes}
                      onChange={(e) => setTechNotes(e.target.value)}
                      rows={5}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent resize-none"
                      placeholder="Add notes about the solution or actions taken..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-700 text-white py-3 rounded-lg font-semibold hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Updating...' : 'Update Ticket'}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20">
                <svg className="w-20 h-20 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 text-center">Select a ticket to view details and update status</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
