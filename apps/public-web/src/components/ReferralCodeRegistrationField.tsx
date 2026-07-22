'use client';

type ReferralCodeRegistrationFieldProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
};

export function normalizeReferralCodeInput(value: string): string {
  return value.toUpperCase().replace(/\s/g, '');
}

export function isReferralCodeProvided(value: string): boolean {
  return normalizeReferralCodeInput(value).length > 0;
}

export function isReferralCodeSkipped(value: string): boolean {
  const code = normalizeReferralCodeInput(value);
  return code === 'N/A' || code === 'NA';
}

export function ReferralCodeRegistrationField({
  value,
  onChange,
  id = 'referral-code',
}: ReferralCodeRegistrationFieldProps) {
  const normalized = normalizeReferralCodeInput(value);

  return (
    <div className="rounded-[1.5rem] border-2 border-slate-900 bg-slate-900 p-6 shadow-lg">
      <label htmlFor={id} className="block text-base font-black text-white uppercase tracking-wide mb-2">
        Código de referido *
      </label>
      <p className="text-sm text-white font-semibold mb-4 leading-relaxed">
        Si un afiliado, vendedor o dealer te invitó, escribe su código aquí.{' '}
        <span className="font-black">Si nadie te invitó, escribe N/A.</span>
      </p>
      <input
        id={id}
        type="text"
        required
        value={value}
        onChange={(e) => onChange(normalizeReferralCodeInput(e.target.value))}
        className="w-full bg-white border-2 border-white rounded-[1.25rem] px-6 py-4 text-slate-900 font-black font-mono text-lg placeholder:text-slate-400 outline-none focus:ring-4 focus:ring-primary-500/40"
        placeholder="JUAN2026 o N/A"
        autoComplete="off"
      />
      {normalized && !isReferralCodeSkipped(normalized) && (
        <p className="text-sm text-white font-bold mt-3">Código ingresado: {normalized}</p>
      )}
    </div>
  );
}
