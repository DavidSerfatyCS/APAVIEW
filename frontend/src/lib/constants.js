import { Leaf, Car, Sofa, ArrowUpDown, Snowflake, Trees, Shield } from 'lucide-react';

export const USERS = ['Adam', 'Abi', 'David'];

export const AVATAR_COLORS = {
  Adam:  'bg-indigo-100 text-indigo-700',
  Abi:   'bg-pink-100 text-pink-700',
  David: 'bg-emerald-100 text-emerald-700',
};

export const VOTE_OPTIONS = ['yes', 'maybe', 'no'];

export const VOTE_ACTIVE_CLASS = {
  yes:   'bg-emerald-100 text-emerald-700 border-emerald-300',
  no:    'bg-red-100 text-red-700 border-red-300',
  maybe: 'bg-zinc-200 text-zinc-700 border-zinc-300',
};

export const FEATURE_META = {
  balcony:   { Icon: Leaf,        label: 'Balcón' },
  parking:   { Icon: Car,         label: 'Parking' },
  furnished: { Icon: Sofa,        label: 'Amueblado' },
  elevator:  { Icon: ArrowUpDown, label: 'Ascensor' },
  ac:        { Icon: Snowflake,   label: 'A/C' },
  garden:    { Icon: Trees,       label: 'Jardín' },
  security:  { Icon: Shield,      label: 'Seguridad' },
};
