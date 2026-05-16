export const getInitials = (name: string): string => {
  if (!name) return '';
  const names = name.split(' ');
  return names.map((n) => n[0]).join('').toUpperCase().substring(0, 2);
};

export const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const getStatusColor = (status: string): string => {
  if (!status) return 'bg-slate-100 text-slate-600';
  switch (status.toUpperCase()) {
    case 'SCHEDULED': return 'bg-blue-50 text-blue-700';
    case 'COMPLETED': return 'bg-emerald-50 text-emerald-700';
    case 'CANCELLED': 
    case 'REJECTED': return 'bg-rose-50 text-rose-700';
    case 'PAID': return 'bg-green-50 text-green-700';
    case 'PENDING': return 'bg-amber-50 text-amber-700';
    case 'REFUNDED': return 'bg-slate-100 text-slate-700';
    case 'NO-SHOW': return 'bg-slate-200 text-slate-800 border border-slate-300';
    default: return 'bg-slate-100 text-slate-600';
  }
};

export const formatTime = (timeStr: string): string => {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
};
