import { createClient } from './supabase'

export async function testDatabaseConnection() {
  const supabase = createClient()
  
  try {
    // Test if we can connect to the database
    console.log('Testing database connection...')
    
    // Try to select from Users table
    const { data: users, error: usersError } = await supabase
      .from('Users')
      .select('*')
      .limit(1)
    
    if (usersError) {
      console.error('Error accessing Users table:', usersError)
      return { success: false, error: usersError.message }
    }
    
    console.log('Users table accessible, found', users?.length || 0, 'users')
    
    // Try to get table schema info
    const { data: schema, error: schemaError } = await supabase
      .from('Users')
      .select('*')
      .limit(0)
    
    if (schemaError) {
      console.error('Error getting schema:', schemaError)
    } else {
      console.log('Schema test successful')
    }
    
    return { success: true, users: users?.length || 0 }
    
  } catch (error: any) {
    console.error('Database connection test failed:', error)
    return { success: false, error: error.message }
  }
}

export async function testUserInsert() {
  const supabase = createClient()
  
  try {
    const testUser = {
      id: 'test-' + Date.now(),
      email: 'test@example.com',
      password: 'testpassword',
      created_at: new Date().toISOString(),
    }
    
    console.log('Testing user insert with:', testUser)
    
    const { data, error } = await supabase
      .from('Users')
      .insert(testUser)
      .select()
    
    if (error) {
      console.error('User insert test failed:', error)
      return { success: false, error: error.message }
    }
    
    console.log('User insert test successful:', data)
    
    // Clean up test user
    await supabase
      .from('Users')
      .delete()
      .eq('id', testUser.id)
    
    return { success: true, data }
    
  } catch (error: any) {
    console.error('User insert test failed:', error)
    return { success: false, error: error.message }
  }
} 