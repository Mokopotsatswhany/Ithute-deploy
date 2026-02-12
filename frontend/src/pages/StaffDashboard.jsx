import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function StaffDashboard() {
  const { user, profile, signOut } = useAuth()
  const [description, setDescription] = useState('')
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [searchToken, setSearchToken] = useState('')
  const [selectedTicket, setSelectedTicket] = useState(null)

  useEffect(() => {
    fetchMyTickets()
  }, [user])

  const fetchMyTickets = async () => {
    if (!user) return

    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('reporter_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching tickets:', error)
    } else {
      setTickets(data || [])
    }
  }

  const generateToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let token = ''
    for (let i = 0; i < 8; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return token
  }

  const classifyProblem = (desc) => {
    const text = desc.toLowerCase()
    let classification = 'General'
    let severity = 'MEDIUM'

    if (text.match(/hot|smoke|fire|burning|overheating/)) {
      classification = 'Hardware'
      severity = 'CRITICAL'
    } else if (text.match(/broken|dead|not working|damaged/)) {
      classification = 'Hardware'
      severity = 'HIGH'
    } else if (text.match(/printer|mouse|keyboard|monitor|screen/)) {
      classification = 'Hardware'
      severity = 'MEDIUM'
    } else if (text.match(/network|wifi|internet|connection|slow/)) {
      classification = 'Network'
      severity = text.match(/down|offline/) ? 'HIGH' : 'MEDIUM'
    } else if (text.match(/software|program|application|error|crash/)) {
      classification = 'Software'
      severity = 'MEDIUM'
    }

    return { classification, severity }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const token = generateToken()
      const { classification, severity } = classifyProblem(description)

      const { data, error } = await supabase
        .from('tickets')
        .insert([
          {
            token,
            reporter_id: user.id,
            branch: profile?.branch || 'Main Campus',
            description,
            ai_classification: classification,
            severity,
            status: 'pending',
          },
        ])
        .select()

      if (error) throw error

      setMessage(`Ticket #${token} created successfully!`)
      setDescription('')
      fetchMyTickets()
    } catch (error) {
      console.error('Error creating ticket:', error)
      setMessage('Error creating ticket. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchToken.trim()) return

    const cleanToken = searchToken.replace('#', '').trim().toUpperCase()
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('token', cleanToken)
      .eq('reporter_id', user.id)
      .maybeSingle()

    if (data) {
      setSelectedTicket(data)
    } else {
      setMessage(`Ticket #${cleanToken} not found`)
      setSelectedTicket(null)
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
        return 'text-red-700 font-bold'
      case 'HIGH':
        return 'text-orange-700 font-semibold'
      case 'MEDIUM':
        return 'text-yellow-700'
      case 'LOW':
        return 'text-green-700'
      default:
        return 'text-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">LEC Ithute</h1>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Report Problem</h2>

            {message && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm">
                {message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe the problem
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  rows={5}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="My computer is overheating and making loud noises..."
                />
              </div>

              <button
                type="submit"
                disabled={loading || !description.trim()}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating Ticket...' : 'Submit Problem'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Search Ticket</h3>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchToken}
                  onChange={(e) => setSearchToken(e.target.value)}
                  placeholder="Enter ticket number"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  maxLength={8}
                />
                <button
                  onClick={handleSearch}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition"
                >
                  Search
                </button>
              </div>
            </div>

            {selectedTicket && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-lg font-bold text-gray-800">#{selectedTicket.token}</h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedTicket.status)}`}>
                    {selectedTicket.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">{selectedTicket.description}</p>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{selectedTicket.ai_classification}</span>
                  <span className={getSeverityColor(selectedTicket.severity)}>{selectedTicket.severity}</span>
                </div>
                {selectedTicket.tech_notes && (
                  <div className="mt-3 pt-3 border-t border-gray-300">
                    <p className="text-xs font-semibold text-gray-700">Tech Notes:</p>
                    <p className="text-sm text-gray-600">{selectedTicket.tech_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">My Tickets ({tickets.length})</h2>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {tickets.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No tickets yet. Report a problem to get started.</p>
              ) : (
                tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md transition cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-800">#{ticket.token}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{ticket.description}</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">{ticket.ai_classification}</span>
                      <span className={getSeverityColor(ticket.severity)}>{ticket.severity}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(ticket.created_at).toLocaleDateString()} {new Date(ticket.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
