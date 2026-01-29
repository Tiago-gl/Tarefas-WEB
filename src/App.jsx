import { useEffect, useRef, useState } from 'react'

const emptyForm = {
  nome: '',
  custo: '',
  data_limite: ''
}

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
})

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const apiUrl = (path) => `${API_BASE_URL}${path}`

function formatCurrency(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'R$ 0,00'
  }
  return currencyFormatter.format(Number(value))
}

function formatDateBR(isoDate) {
  if (!isoDate) return ''
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) return ''
  return `${day}/${month}/${year}`
}

function parseDateBRToISO(value) {
  if (!value) return null
  const parts = value.split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts
  if (!day || !month || !year) return null
  const iso = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() + 1 !== Number(month) ||
    date.getUTCDate() !== Number(day)
  ) {
    return null
  }
  return iso
}

function normalizeDateInput(value) {
  const digits = (value || '').replace(/\D/g, '').slice(0, 8)
  const day = digits.slice(0, 2)
  const month = digits.slice(2, 4)
  const year = digits.slice(4, 8)
  if (digits.length <= 2) return day
  if (digits.length <= 4) return `${day}/${month}`
  return `${day}/${month}/${year}`
}

function isoToDateInput(isoDate) {
  if (!isoDate) return ''
  const [year, month, day] = isoDate.split('-')
  if (!year || !month || !day) return ''
  return `${year}-${month}-${day}`
}

async function safeJson(res) {
  try {
    return await res.json()
  } catch (error) {
    return {}
  }
}

export default function App() {
  const datePickerRef = useRef(null)
  const [tarefas, setTarefas] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [formData, setFormData] = useState(emptyForm)
  const [formErrors, setFormErrors] = useState({})
  const [editingId, setEditingId] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [actionMessage, setActionMessage] = useState('')

  const fetchTarefas = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(apiUrl('/api/tarefas'))
      if (!res.ok) {
        const body = await safeJson(res)
        throw new Error(body.error || 'Erro ao carregar tarefas.')
      }
      const data = await res.json()
      setTarefas(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Erro ao carregar tarefas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTarefas()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setFormData(emptyForm)
    setFormErrors({})
    setActionMessage('')
    setFormOpen(true)
  }

  const openEdit = (tarefa) => {
    setEditingId(tarefa.id)
    setFormData({
      nome: tarefa.nome ?? '',
      custo: tarefa.custo ?? '',
      data_limite: formatDateBR(tarefa.data_limite)
    })
    setFormErrors({})
    setActionMessage('')
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditingId(null)
  }

  const handleInputChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value
    }))
  }

  const submitForm = async (event) => {
    event.preventDefault()
    setFormErrors({})
    setActionMessage('')

    const errors = {}
    if (!formData.nome || !formData.nome.trim()) {
      errors.nome = 'Nome e obrigatorio.'
    }

    if (formData.custo === '' || formData.custo === null) {
      errors.custo = 'Custo e obrigatorio.'
    } else if (Number.isNaN(Number(formData.custo))) {
      errors.custo = 'Custo deve ser um numero.'
    } else if (Number(formData.custo) < 0) {
      errors.custo = 'Custo deve ser maior ou igual a zero.'
    }

    const isoDate = parseDateBRToISO(formData.data_limite)
    if (!formData.data_limite || !isoDate) {
      errors.data_limite = 'Data limite deve estar em dd/MM/yyyy.'
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    const payload = {
      nome: formData.nome.trim(),
      custo: Number(formData.custo),
      data_limite: isoDate
    }

    const isEditing = Boolean(editingId)
    const url = isEditing ? `/api/tarefas/${editingId}` : '/api/tarefas'
    const method = isEditing ? 'PUT' : 'POST'

    const res = await fetch(apiUrl(url), {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      const body = await safeJson(res)
      if (res.status === 400 && body.errors) {
        setFormErrors(body.errors)
        return
      }
      setActionMessage(body.error || 'Erro ao salvar tarefa.')
      return
    }

    closeForm()
    await fetchTarefas()
  }

  const requestDelete = (id) => {
    setDeleteId(id)
    setDeleteOpen(true)
    setActionMessage('')
  }

  const closeDelete = () => {
    setDeleteOpen(false)
    setDeleteId(null)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    const res = await fetch(apiUrl(`/api/tarefas/${deleteId}`), {
      method: 'DELETE'
    })
    if (!res.ok) {
      const body = await safeJson(res)
      setActionMessage(body.error || 'Erro ao excluir tarefa.')
      return
    }
    closeDelete()
    await fetchTarefas()
  }

  const moveTarefa = async (id, direction) => {
    setActionMessage('')
    const res = await fetch(apiUrl(`/api/tarefas/${id}/mover`), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ direction })
    })

    if (!res.ok) {
      const body = await safeJson(res)
      setActionMessage(body.error || 'Erro ao reordenar tarefa.')
      return
    }

    await fetchTarefas()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sand via-white to-accentSoft/40 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-gray-500">Lista de prioridades</p>
            <h1 className="text-3xl font-semibold text-ink sm:text-4xl">Gestao de tarefas</h1>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white shadow-lg shadow-accent/30 transition hover:-translate-y-0.5 hover:bg-ink"
          >
            Nova tarefa
          </button>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {actionMessage && (
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800">
            {actionMessage}
          </div>
        )}

        <div className="rounded-3xl bg-white p-6 shadow-xl shadow-black/5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tarefas cadastradas</h2>
            {loading && <span className="text-sm text-gray-500">Carregando...</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-widest text-gray-400">
                <tr>
                  <th className="px-3 py-3">Nome</th>
                  <th className="px-3 py-3">Custo</th>
                  <th className="px-3 py-3">Data limite</th>
                  <th className="px-3 py-3 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {tarefas.map((tarefa, index) => {
                  const isHighCost = Number(tarefa.custo) >= 1000
                  const isFirst = index === 0
                  const isLast = index === tarefas.length - 1

                  return (
                    <tr
                      key={tarefa.id}
                      className={`border-t ${
                        isHighCost ? 'bg-accentSoft/70' : 'bg-white'
                      }`}
                    >
                      <td className="px-3 py-4 font-medium text-ink">{tarefa.nome}</td>
                      <td className="px-3 py-4">{formatCurrency(tarefa.custo)}</td>
                      <td className="px-3 py-4">{formatDateBR(tarefa.data_limite)}</td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(tarefa)}
                            className="rounded-full border border-ink/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink transition hover:border-ink hover:bg-ink hover:text-white"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => requestDelete(tarefa.id)}
                            className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-red-600 transition hover:border-red-500 hover:bg-red-500 hover:text-white"
                          >
                            Excluir
                          </button>
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => moveTarefa(tarefa.id, 'up')}
                            className="rounded-full border border-ink/10 px-3 py-2 text-xs font-semibold text-ink transition hover:border-ink hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => moveTarefa(tarefa.id, 'down')}
                            className="rounded-full border border-ink/10 px-3 py-2 text-xs font-semibold text-ink transition hover:border-ink hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            ↓
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4 modal-backdrop">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
            <h3 className="mb-6 text-xl font-semibold">
              {editingId ? 'Editar tarefa' : 'Nova tarefa'}
            </h3>
            <form className="space-y-4" onSubmit={submitForm}>
              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">Nome</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={handleInputChange('nome')}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-ink"
                  placeholder="Nome da tarefa"
                />
                {formErrors.nome && (
                  <p className="mt-2 text-xs text-red-600">{formErrors.nome}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">Custo</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.custo}
                  onChange={handleInputChange('custo')}
                  className="mt-2 w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-ink"
                  placeholder="0.00"
                />
                {formErrors.custo && (
                  <p className="mt-2 text-xs text-red-600">{formErrors.custo}</p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Data limite (dd/MM/yyyy)
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.data_limite}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        data_limite: normalizeDateInput(event.target.value)
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-ink"
                    placeholder="31/12/2026"
                    inputMode="numeric"
                    maxLength={10}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!datePickerRef.current) return
                      if (typeof datePickerRef.current.showPicker === 'function') {
                        datePickerRef.current.showPicker()
                      } else {
                        datePickerRef.current.focus()
                        datePickerRef.current.click()
                      }
                    }}
                    className="rounded-2xl border border-ink/10 px-4 py-3 text-xs font-semibold uppercase tracking-widest text-ink transition hover:border-ink"
                  >
                    Calendario
                  </button>
                  <input
                    ref={datePickerRef}
                    type="date"
                    value={isoToDateInput(parseDateBRToISO(formData.data_limite))}
                    onChange={(event) => {
                      const iso = event.target.value
                      const br = formatDateBR(iso)
                      setFormData((prev) => ({
                        ...prev,
                        data_limite: br
                      }))
                    }}
                    className="absolute h-0 w-0 opacity-0"
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                </div>
                {formErrors.data_limite && (
                  <p className="mt-2 text-xs text-red-600">{formErrors.data_limite}</p>
                )}
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-full border border-ink/10 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-ink transition hover:border-ink"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-ink px-6 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-accent"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4 modal-backdrop">
          <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
            <h3 className="mb-4 text-xl font-semibold">Confirmar exclusao</h3>
            <p className="mb-6 text-sm text-gray-500">
              Tem certeza que deseja excluir esta tarefa? Essa acao nao pode ser desfeita.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDelete}
                className="rounded-full border border-ink/10 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-ink transition hover:border-ink"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-full bg-red-500 px-6 py-2 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-red-600"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
