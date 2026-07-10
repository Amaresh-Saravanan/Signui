import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Mail, MapPin, MessageSquare } from 'lucide-react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

export function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  const CONTACTS = [
    { icon: Mail,          label: 'Email',      value: 'support@signbridge.com' },
    { icon: MessageSquare, label: 'Live chat',  value: 'Available 9 am – 5 pm EST' },
    { icon: MapPin,        label: 'Office',     value: '123 Tech Ave, San Francisco, CA' },
  ];

  return (
    <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-10 pb-10 page-enter">
      <div className="flex-1">
        <p className="text-[10px] font-mono-sb uppercase tracking-widest text-primary mb-3">Get in touch</p>
        <h1 className="text-2xl font-general font-semibold mb-4" style={{ fontFamily: 'var(--font-general)' }}>
          We're here to help.
        </h1>
        <p className="text-sm text-text-secondary mb-8 leading-relaxed">
          Questions, bugs, feedback — we read every message. Typical response time is under 24 hours on weekdays.
        </p>
        <div className="flex flex-col gap-5">
          {CONTACTS.map(c => (
            <div key={c.label} className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-lg bg-primary-soft flex items-center justify-center text-primary shrink-0">
                <c.icon size={16} />
              </div>
              <div>
                <p className="text-[10px] font-mono-sb text-text-secondary uppercase tracking-widest">{c.label}</p>
                <p className="text-sm text-text-primary">{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 max-w-sm">
        <Card padding="lg">
          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-8"
              >
                <CheckCircle2 size={44} className="text-success mb-4" />
                <h3 className="font-general font-semibold text-lg mb-1" style={{ fontFamily: 'var(--font-general)' }}>
                  Message sent
                </h3>
                <p className="text-sm text-text-secondary">We'll reply within one business day.</p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleSubmit}
                className="flex flex-col gap-4"
              >
                <h3 className="font-general font-semibold" style={{ fontFamily: 'var(--font-general)' }}>
                  Send a message
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="First name" placeholder="Jane" required />
                  <Input label="Last name"  placeholder="Doe"  required />
                </div>
                <Input label="Email" type="email" placeholder="you@example.com" required />
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text-secondary">Message</label>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                    rows={4}
                    placeholder="How can we help?"
                    className="w-full rounded-xl border border-border bg-surface-alt p-3.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 resize-none transition-all"
                    aria-label="Message"
                  />
                </div>
                <Button type="submit" fullWidth disabled={!message.trim()}>
                  Send message
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </Card>
      </div>
    </div>
  );
}