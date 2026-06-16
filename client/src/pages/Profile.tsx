import { Briefcase, Building2, KeyRound, Mail, Phone, Shield, User } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card.tsx';
import { useAuth } from '../context/AuthContext.tsx';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Администратор',
  employee: 'Сотрудник',
};

function InfoItem({
  icon: Icon,
  label,
  value,
  href,
  className = '',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | null | undefined;
  href?: string;
  className?: string;
}) {
  const text = value?.trim() || '—';

  return (
    <div className={`flex gap-4 rounded-xl border border-border/60 bg-card p-5 shadow-sm ${className}`}>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#3d848c]/10 text-[#3d848c]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {href && text !== '—' ? (
          <a href={href} className="mt-1 block text-base font-medium break-words text-[#3d848c] hover:underline">
            {text}
          </a>
        ) : (
          <p className="mt-1 text-base font-medium break-words">{text}</p>
        )}
      </div>
    </div>
  );
}

export default function Profile() {
  const { user } = useAuth();

  if (!user) {
    return <p className="text-sm text-muted-foreground">Загрузка…</p>;
  }

  const displayName = user.displayName || user.login;
  const initial = displayName[0]?.toUpperCase() ?? '?';
  const roleLabel = ROLE_LABELS[user.role] ?? user.role;

  return (
    <div className="w-full">
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <div
          className="px-8 py-10"
          style={{ background: 'linear-gradient(135deg, #2d6b72 0%, #3d848c 55%, #4a9da6 100%)' }}
        >
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-center sm:text-left">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white/30 bg-white/20 text-3xl font-bold text-white shadow-lg backdrop-blur-sm">
              {initial}
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-white">{displayName}</h1>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
                <Shield className="h-4 w-4" />
                {roleLabel}
              </span>
            </div>
          </div>
        </div>

        <CardContent className="bg-muted/15 px-8 py-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <InfoItem icon={KeyRound} label="Логин" value={user.login} />
            <InfoItem icon={User} label="Имя" value={user.displayName} />
            <InfoItem
              icon={Mail}
              label="Email"
              value={user.email}
              href={user.email ? `mailto:${user.email}` : undefined}
            />
            <InfoItem
              icon={Phone}
              label="Телефон"
              value={user.phone}
              href={user.phone ? `tel:${user.phone}` : undefined}
            />
            <InfoItem icon={Briefcase} label="Должность" value={user.position} />
            <InfoItem icon={Building2} label="Подразделение" value={user.departmentName} />
            <InfoItem
              icon={Building2}
              label="Организация"
              value={user.organization}
              className="md:col-span-2 xl:col-span-3"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
