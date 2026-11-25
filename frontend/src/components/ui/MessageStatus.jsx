// src/components/ui/MessageStatus.jsx
import React from 'react';
import { Check } from 'lucide-react';

export default function MessageStatus({ status = 'sent', onCycleStatus }) {
  if (status === 'pending') {
    return (
      <span
        className="msg-status msg-status-pending"
        title="Не отправлено (проверьте соединение)"
        onClick={onCycleStatus}
      >
        <Check size={13} strokeWidth={2.4} />
      </span>
    );
  }

  if (status === 'read') {
    return (
      <span
        className="msg-status msg-status-read"
        title="Прочитано"
        onClick={onCycleStatus}
      >
        <span className="msg-read-circle" />
      </span>
    );
  }

  return (
    <span
      className="msg-status msg-status-sent"
      title="Отправлено"
      onClick={onCycleStatus}
    >
      <Check size={13} strokeWidth={2.4} />
    </span>
  );
}