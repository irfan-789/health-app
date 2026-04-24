interface Props {
  onSelect: (symptom: string) => void;
  disabled: boolean;
}

const QUICK_SYMPTOMS = [
  'Fever & chills',
  'Headache',
  'Cough & cold',
  'Sore throat',
  'Stomach pain',
  'Fatigue & weakness',
  'Back pain',
  'Dizziness',
  'Shortness of breath',
  'Skin rash',
  'Anxiety & stress',
  'Joint pain',
];

export default function QuickSymptoms({ onSelect, disabled }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Quick select symptoms</p>
      <div className="flex flex-wrap gap-2">
        {QUICK_SYMPTOMS.map(sym => (
          <button
            key={sym}
            onClick={() => onSelect(`I'm experiencing ${sym.toLowerCase()}`)}
            disabled={disabled}
            className="px-3 py-1.5 rounded-full text-xs font-medium bg-white border border-gray-200
              text-gray-600 hover:border-teal-400 hover:text-teal-700 hover:bg-teal-50
              transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            {sym}
          </button>
        ))}
      </div>
    </div>
  );
}
