import Swal from 'sweetalert2';

// Configuração base para o tema Dark/Brutalista do SGAT
const darkTheme = {
    background: '#0f172a', // Slate 900
    color: '#f8fafc', // Slate 50
    confirmButtonColor: '#2563eb', // Blue 600
    cancelButtonColor: '#334155', // Slate 700
    customClass: {
        popup: 'rounded-[2.5rem] border border-slate-800',
        confirmButton: 'rounded-xl font-black uppercase tracking-widest text-xs px-6 py-3',
        cancelButton: 'rounded-xl font-black uppercase tracking-widest text-xs px-6 py-3'
    }
};

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    background: '#0f172a',
    color: '#f8fafc',
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
});

const notify = {
    success: (msg) => {
        Toast.fire({
            icon: 'success',
            title: msg,
            iconColor: '#10b981' // Emerald 500
        });
    },
    error: (msg) => {
        Toast.fire({
            icon: 'error',
            title: msg,
            iconColor: '#ef4444' // Red 500
        });
    },
    info: (msg) => {
        Toast.fire({
            icon: 'info',
            title: msg,
            iconColor: '#3b82f6' // Blue 500
        });
    },
    warning: (msg) => {
        Toast.fire({
            icon: 'warning',
            title: msg,
            iconColor: '#f59e0b' // Amber 500
        });
    },
    confirm: async (title, text, confirmText = 'Sim, confirmar') => {
        const result = await Swal.fire({
            ...darkTheme,
            title: title.toUpperCase(),
            text: text,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: confirmText.toUpperCase(),
            cancelButtonText: 'CANCELAR',
            reverseButtons: true
        });
        return result.isConfirmed;
    },
    alert: (title, text, icon = 'info') => {
        Swal.fire({
            ...darkTheme,
            title: title.toUpperCase(),
            text: text,
            icon: icon
        });
    },
    prompt: async (title, text, defaultValue = '', inputType = 'text') => {
        const { value } = await Swal.fire({
            ...darkTheme,
            title: title.toUpperCase(),
            text: text,
            input: inputType,
            inputValue: defaultValue,
            showCancelButton: true,
            confirmButtonText: 'CONFIRMAR',
            cancelButtonText: 'CANCELAR',
            reverseButtons: true
        });
        return value;
    }
};

export default notify;
