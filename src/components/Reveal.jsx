import { useInView } from "../hooks/useInView";

/**
 * Fades + lifts its children into view once, when scrolled to.
 * Uses the .rv / .rv.in CSS pair; reduced-motion shows content immediately.
 */
export function Reveal({ as: Tag = "div", children, className, delay = 0, ...rest }) {
  const [ref, inView] = useInView();
  const cls = ["rv", inView ? "in" : "", className].filter(Boolean).join(" ");
  return (
    <Tag
      ref={ref}
      className={cls}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
}
