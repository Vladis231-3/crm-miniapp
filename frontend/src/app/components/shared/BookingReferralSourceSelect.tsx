import { REFERRAL_SOURCES } from '../../constants/referralSources';

export function BookingReferralSourceSelect({
  className,
  value,
  onChange,
}: {
  className: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <select aria-label="Как узнал о нас" className={className} value={value} onChange={(event) => onChange(event.target.value)}>
      {value && !REFERRAL_SOURCES.some((source) => source.value === value) && <option value={value}>{value}</option>}
      {REFERRAL_SOURCES.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
    </select>
  );
}
