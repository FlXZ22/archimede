import React, { useEffect, useRef } from 'react';

const paths = {
  plus: <path d="M12 5v14M5 12h14"/>,
  left: <path d="m10 7-5 5 5 5M5 12h14"/>,
  right: <path d="m14 7 5 5-5 5M19 12H5"/>,
  chevron: <path d="m5 9 7 7 7-7"/>,
  pause: <path d="M9 5v14m6-14v14"/>,
  play: <path d="m8 5 12 7-12 7Z" fill="currentColor" stroke="none"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  bell: <path d="M12 2a6.5 6.5 0 0 0-6.5 6.5c0 4-2 4.4-2 6.1 0 2 2.3 2.4 8.5 2.4s8.5-.4 8.5-2.4c0-1.7-2-2.1-2-6.1A6.5 6.5 0 0 0 12 2Zm-3 17a3 3 0 0 0 6 0Z" fill="currentColor" stroke="none"/>,
  invite: <><circle cx="9" cy="7" r="5" fill="currentColor" opacity=".45" stroke="none"/><ellipse cx="9" cy="17" rx="7.5" ry="3.5" fill="currentColor" stroke="none"/><path d="M19 7v6m-3-3h6" opacity=".55"/></>,
  person: <><circle cx="12" cy="7" r="5" fill="currentColor" stroke="none"/><ellipse cx="12" cy="18" rx="8" ry="3.5" fill="currentColor" stroke="none"/></>,
  document: <><rect x="3.5" y="2" width="17" height="20" rx="4" fill="currentColor" stroke="none"/><path d="M8 8h4m-4 4h8m-8 4h6" stroke="#edf3fa" strokeWidth="1.6"/></>,
  edit: <><path d="m4 14 9-10a2 2 0 0 1 3 0l2 2a2 2 0 0 1 0 3l-9 10-5 1Z" fill="currentColor" stroke="none"/><path d="m12 6 5 4M15 19h6" strokeWidth="1.5"/></>,
};

export function Icon({ name, className }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export function IconButton({ icon, label, ...props }) {
  return <button type="button" className="icon-button" aria-label={label} {...props}><Icon name={icon} /></button>;
}

export function Modal({ title, children, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    dialogRef.current.showModal();
  }, []);

  return (
    <dialog ref={dialogRef} aria-labelledby="dialog-title" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <header className="dialog-heading">
        <h2 id="dialog-title">{title}</h2>
        <IconButton icon="close" label="Close dialog" onClick={onClose} />
      </header>
      {children}
    </dialog>
  );
}
