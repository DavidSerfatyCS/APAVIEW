require('dotenv').config();
const { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');

let supabase = null;

if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
}

// In-memory fallback used until Supabase credentials are provided
const memory = [];
const memoryVotes = [];
const memoryComments = [];

// ─── Apartments ───────────────────────────────────────────────

async function getApartments() {
  if (supabase) {
    const { data, error } = await supabase
      .from('apartments')
      .select('*, votes(user_name, vote)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
  return [...memory]
    .reverse()
    .map((a) => ({
      ...a,
      votes: memoryVotes
        .filter((v) => v.apartment_id === a.id)
        .map(({ user_name, vote }) => ({ user_name, vote })),
    }));
}

async function createApartment(fields) {
  if (supabase) {
    const { data, error } = await supabase
      .from('apartments')
      .insert([fields])
      .select()
      .single();
    if (error) throw error;
    return { ...data, votes: [] };
  }
  const record = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    status: 'pending',
    ...fields,
  };
  memory.push(record);
  return { ...record, votes: [] };
}

async function updateApartment(id, fields) {
  if (supabase) {
    const { data, error } = await supabase
      .from('apartments')
      .update(fields)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const record = memory.find((a) => a.id === id);
  if (!record) throw new Error('Not found');
  Object.assign(record, fields);
  return record;
}

async function deleteApartment(id) {
  if (supabase) {
    const { error } = await supabase.from('apartments').delete().eq('id', id);
    if (error) throw error;
    return;
  }
  const idx = memory.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error('Not found');
  memory.splice(idx, 1);
  // Cascade
  for (let i = memoryVotes.length - 1; i >= 0; i--) {
    if (memoryVotes[i].apartment_id === id) memoryVotes.splice(i, 1);
  }
  for (let i = memoryComments.length - 1; i >= 0; i--) {
    if (memoryComments[i].apartment_id === id) memoryComments.splice(i, 1);
  }
}

async function findApartmentByUrl(url) {
  if (supabase) {
    const { data, error } = await supabase
      .from('apartments')
      .select('*, votes(user_name, vote)')
      .eq('url', url)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }
  const found = memory.find((a) => a.url === url);
  if (!found) return null;
  return {
    ...found,
    votes: memoryVotes
      .filter((v) => v.apartment_id === found.id)
      .map(({ user_name, vote }) => ({ user_name, vote })),
  };
}

async function getApartment(id) {
  if (supabase) {
    const { data, error } = await supabase.from('apartments').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  }
  return memory.find((a) => a.id === id) || null;
}

// ─── Votes ────────────────────────────────────────────────────

async function upsertVote(apartmentId, userName, vote) {
  if (supabase) {
    const { data, error } = await supabase
      .from('votes')
      .upsert(
        { apartment_id: apartmentId, user_name: userName, vote },
        { onConflict: 'apartment_id,user_name' }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const existing = memoryVotes.find(
    (v) => v.apartment_id === apartmentId && v.user_name === userName
  );
  if (existing) {
    existing.vote = vote;
    return existing;
  }
  const record = {
    id: randomUUID(),
    apartment_id: apartmentId,
    user_name: userName,
    vote,
    created_at: new Date().toISOString(),
  };
  memoryVotes.push(record);
  return record;
}

async function deleteVote(apartmentId, userName) {
  if (supabase) {
    const { error } = await supabase
      .from('votes')
      .delete()
      .eq('apartment_id', apartmentId)
      .eq('user_name', userName);
    if (error) throw error;
    return;
  }
  const idx = memoryVotes.findIndex(
    (v) => v.apartment_id === apartmentId && v.user_name === userName
  );
  if (idx !== -1) memoryVotes.splice(idx, 1);
}

// ─── Comments ─────────────────────────────────────────────────

async function getCommentsByApartment(apartmentId) {
  if (supabase) {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('apartment_id', apartmentId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  }
  return memoryComments
    .filter((c) => c.apartment_id === apartmentId)
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

async function createComment(apartmentId, userName, text) {
  if (supabase) {
    const { data, error } = await supabase
      .from('comments')
      .insert([{ apartment_id: apartmentId, user_name: userName, text }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  const record = {
    id: randomUUID(),
    apartment_id: apartmentId,
    user_name: userName,
    text,
    created_at: new Date().toISOString(),
  };
  memoryComments.push(record);
  return record;
}

async function deleteComment(commentId) {
  if (supabase) {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) throw error;
    return;
  }
  const idx = memoryComments.findIndex((c) => c.id === commentId);
  if (idx !== -1) memoryComments.splice(idx, 1);
}

module.exports = {
  getApartments,
  getApartment,
  findApartmentByUrl,
  createApartment,
  updateApartment,
  deleteApartment,
  upsertVote,
  deleteVote,
  getCommentsByApartment,
  createComment,
  deleteComment,
};
