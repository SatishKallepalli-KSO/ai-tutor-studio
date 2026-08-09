import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from './api'
import { useAuth } from './auth'
import { type Persona, PERSONAS } from './brand'

const STORAGE_KEY = 'ats_persona'

type PersonaContextValue = {
  persona: Persona
  setPersona: (next: Persona) => Promise<void>
  isLearner: boolean
  isRecruiter: boolean
  homePath: string
}

const PersonaContext = createContext<PersonaContextValue | null>(null)

function readStored(): Persona {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'recruiter' || raw === 'learner') return raw
  } catch {
    /* ignore */
  }
  return 'learner'
}

export function PersonaProvider({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth()
  const [persona, setPersonaState] = useState<Persona>(() => readStored())

  useEffect(() => {
    if (user?.persona === 'learner' || user?.persona === 'recruiter') {
      setPersonaState(user.persona)
      try {
        localStorage.setItem(STORAGE_KEY, user.persona)
      } catch {
        /* ignore */
      }
    }
  }, [user?.persona])

  const setPersona = useCallback(
    async (next: Persona) => {
      setPersonaState(next)
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        /* ignore */
      }
      if (user) {
        try {
          const updated = await api.updatePersona(next)
          setUser(updated)
        } catch {
          /* Pages-only / offline — local preference still applies */
        }
      }
    },
    [user, setUser],
  )

  const value = useMemo(
    () => ({
      persona,
      setPersona,
      isLearner: persona === 'learner',
      isRecruiter: persona === 'recruiter',
      homePath: PERSONAS[persona].homePath,
    }),
    [persona, setPersona],
  )

  return (
    <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>
  )
}

export function usePersona() {
  const ctx = useContext(PersonaContext)
  if (!ctx) throw new Error('usePersona must be used within PersonaProvider')
  return ctx
}
