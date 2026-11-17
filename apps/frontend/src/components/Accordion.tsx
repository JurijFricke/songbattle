import { useState, type ReactNode } from 'react';
import styles from './Accordion.module.css';

interface AccordionProps {
  title: string;
  children: ReactNode;
}

const Accordion = ({ title, children }: AccordionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.accordion}>
      <button
        type="button"
        className={styles.accordionHeader}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={styles.accordionTitle}>{title}</span>
        <span className={`${styles.accordionIcon} ${isOpen ? styles.open : ''}`} aria-hidden="true">+</span>
      </button>
      <div className={`${styles.accordionContent} ${isOpen ? styles.open : ''}`}>
        {children}
      </div>
    </div>
  );
};

export default Accordion;
