import type { ButtonHTMLAttributes } from "react";

type TabButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export function TabButton({ active = false, className = "", ...props }: TabButtonProps) {
  return <button className={`tab-button ${active ? "tab-button--active" : ""} ${className}`} {...props} />;
}
