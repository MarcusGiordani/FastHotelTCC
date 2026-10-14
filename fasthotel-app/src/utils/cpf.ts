// fasthotel-app/src/utils/cpf.ts
//
// Utilitários de CPF compartilhados pelas telas de cadastro/edição de hóspede.
// Armazenamento é sempre em dígitos puros (11 números) — a máscara abaixo é
// só para exibição; o mesmo algoritmo de validação é usado em cadastro e edição.

/** Remove tudo que não é dígito. */
export function apenasDigitos(valor: string): string {
  return valor.replace(/\D/g, '');
}

/** Aplica a máscara 000.000.000-00 progressivamente, aceitando colado com ou sem pontuação. */
export function mascararCpf(valor: string): string {
  const digitos = apenasDigitos(valor).slice(0, 11);
  const partes = [
    digitos.slice(0, 3),
    digitos.slice(3, 6),
    digitos.slice(6, 9),
    digitos.slice(9, 11),
  ];
  let resultado = partes[0];
  if (partes[1]) resultado += `.${partes[1]}`;
  if (partes[2]) resultado += `.${partes[2]}`;
  if (partes[3]) resultado += `-${partes[3]}`;
  return resultado;
}

/** Valida os dígitos verificadores do CPF (algoritmo padrão). Aceita com ou sem pontuação. */
export function cpfValido(valor: string): boolean {
  const digitos = apenasDigitos(valor);
  if (digitos.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digitos)) return false; // ex: 00000000000 (nunca válido)

  const calcularDigito = (base: string): number => {
    let soma = 0;
    let peso = base.length + 1;
    for (const digito of base) {
      soma += Number(digito) * peso;
      peso -= 1;
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const base9 = digitos.slice(0, 9);
  const digito1 = calcularDigito(base9);
  const digito2 = calcularDigito(base9 + digito1);
  return digitos === base9 + String(digito1) + String(digito2);
}
