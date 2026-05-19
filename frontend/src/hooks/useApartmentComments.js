import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { API } from '../lib/config';

export default function useApartmentComments(apartmentId, enabled) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchComments = useCallback(async () => {
    if (!apartmentId) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/apartments/${apartmentId}/comments`);
      setComments(data);
    } catch (err) {
      console.error('Error fetching comments', err);
    } finally {
      setLoading(false);
    }
  }, [apartmentId]);

  useEffect(() => {
    if (!enabled) return;
    fetchComments();
  }, [enabled, fetchComments]);

  useEffect(() => {
    if (!enabled || !supabase || !apartmentId) return;
    const channel = supabase
      .channel(`comments-${apartmentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `apartment_id=eq.${apartmentId}` },
        () => fetchComments()
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [enabled, apartmentId, fetchComments]);

  async function addComment(userName, text) {
    const { data } = await axios.post(`${API}/api/apartments/${apartmentId}/comments`, {
      user_name: userName,
      text,
    });
    setComments((prev) => [...prev, data]);
  }

  async function removeComment(commentId) {
    await axios.delete(`${API}/api/apartments/${apartmentId}/comments/${commentId}`);
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  return { comments, loading, addComment, removeComment };
}
