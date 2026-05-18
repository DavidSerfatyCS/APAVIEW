require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

let supabase = null;

if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// In-memory fallback used until Supabase credentials are provided
const memory = [];

async function getApartments() {
  if (supabase) {
    const { data, error } = await supabase
      .from('apartments')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
  return [...memory].reverse();
}

async function createApartment(fields) {
  if (supabase) {
    const { data, error } = await supabase
      .from('apartments')
      .insert([fields])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const record = {
    id: require('crypto').randomUUID(),
    created_at: new Date().toISOString(),
    status: 'pending',
    ...fields,
  };
  memory.push(record);
  return record;
}

async function updateApartmentStatus(id, status) {
  if (supabase) {
    const { data, error } = await supabase
      .from('apartments')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const record = memory.find((a) => a.id === id);
  if (!record) throw new Error('Not found');
  record.status = status;
  return record;
}

module.exports = { supabase, getApartments, createApartment, updateApartmentStatus };
