import React, { useState, ReactNode } from 'react';
import styles from './Accordion.module.css';

interface AccordionProps {
  title: string;
  children: ReactNode;
}

const Accordion = ({ title, children }: AccordionProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={styles.accordion}>
      <div className={styles.accordionHeader} onClick={() => setIsOpen(!isOpen)}>
        <span className={styles.accordionTitle}>{title}</span>
        <span className={`${styles.accordionIcon} ${isOpen ? styles.open : ''}`}>+</span>
      </div>
      <div className={`${styles.accordionContent} ${isOpen ? styles.open : ''}`}>
        {children}
      </div>
    </div>
  );
};

export default Accordion;
