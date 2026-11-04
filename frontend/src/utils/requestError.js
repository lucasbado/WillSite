export function requestError(error, fallback = 'Não foi possível concluir a operação.') {
    if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
        return 'O servidor demorou para responder. Tente novamente em instantes.';
    }
    if (!error?.response) return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
    if (error.response.status >= 500) return 'O serviço está temporariamente indisponível. Tente novamente em instantes.';
    return error.response.data?.msg || fallback;
}
