export const repairTests = ['Imagem e toque', 'Carregamento', 'Áudio e microfone', 'Câmeras', 'Wi-Fi e Bluetooth', 'Ligações e rede móvel'];

export function buildRepairReport({ problem, diagnosis, procedures, parts = [], tests = [], notes }) {
    return [
        problem?.trim() && `RELATO DO CLIENTE\n${problem.trim()}`,
        diagnosis?.trim() && `DIAGNÓSTICO\n${diagnosis.trim()}`,
        procedures?.trim() && `PROCEDIMENTOS REALIZADOS\n${procedures.trim()}`,
        parts.length > 0 && `PEÇAS UTILIZADAS\n${parts.map(part => `• ${part}`).join('\n')}`,
        tests.length > 0 && `TESTES REALIZADOS E APROVADOS\n${tests.map(test => `• ${test}`).join('\n')}`,
        notes?.trim() && `ORIENTAÇÕES E OBSERVAÇÕES\n${notes.trim()}`,
    ].filter(Boolean).join('\n\n');
}
