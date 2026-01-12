
import Link from "next/link";

export default function ForecastAction({ action }: { action: { label: string; link: string } }) {
  return (
    <Link href={action.link} className="btn-primary" style={{ display: "block", textAlign: "center", marginBottom: "24px" }}>
        {action.label}
    </Link>
  );
}
