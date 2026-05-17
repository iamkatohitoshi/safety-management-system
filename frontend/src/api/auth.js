import client from './client'

export async function login(email, password) {
  const response = await client.post('/auth/login', { email, password })
  const { token, user } = response.data
  localStorage.setItem('safety_token', token)
  localStorage.setItem('safety_user', JSON.stringify(user))
  return { token, user }
}

export async function register(email, name, password, tenantSlug, role) {
  const response = await client.post('/auth/register', {
    email,
    name,
    password,
    tenantSlug,
    role,
  })
  const { token, user } = response.data
  localStorage.setItem('safety_token', token)
  localStorage.setItem('safety_user', JSON.stringify(user))
  return { token, user }
}

export async function getMe() {
  const response = await client.get('/auth/me')
  return response.data
}
