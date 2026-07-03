type Props = {
  children: string;
  className?: string;
};

export default function TrustReassuranceLine({ children, className }: Props) {
  return <p className={["trust-reassurance-line", className].filter(Boolean).join(" ")}>{children}</p>;
}
