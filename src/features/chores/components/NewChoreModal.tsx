import React, { useState } from 'react';
import { Modal } from '../../../components/common/Modal';
import { Button } from '../../../components/common/Button';
import { Chore } from '../../../types';
import { useToast } from '../../../components/common/Toast';

interface NewChoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddChore: (
    name: string,
    frequency: 'daily' | 'weekly',
    effort: 'light' | 'medium' | 'heavy',
    desc: string
  ) => Promise<Chore>;
}

export const NewChoreModal: React.FC<NewChoreModalProps> = ({
  isOpen,
  onClose,
  onAddChore,
}) => {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [effort, setEffort] = useState<'light' | 'medium' | 'heavy'>('medium');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onAddChore(name.trim(), frequency, effort, desc.trim());
      showToast(`Chore "${name.trim()}" added to the apartment pool!`, 'success');
      setName('');
      setDesc('');
      onClose();
    } catch {
      showToast('Could not add chore. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add apartment chore"
      subtitle="Introduce a recurring task to the pool"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="type-label block mb-1">Chore Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Water plants, Vacuum hallway"
            className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F7F8FB] border-2 border-[#E6E8EE] focus:border-[#FF6B4A] focus:outline-none text-[15px] font-semibold text-[#1F2430] transition-colors duration-150"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="type-label block mb-1">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as 'daily' | 'weekly')}
              className="w-full px-3 py-2.5 rounded-2xl bg-[#F7F8FB] border-2 border-[#E6E8EE] focus:border-[#FF6B4A] focus:outline-none text-[14px] font-semibold text-[#1F2430] transition-colors duration-150"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <label className="type-label block mb-1">Effort Level</label>
            <select
              value={effort}
              onChange={(e) => setEffort(e.target.value as 'light' | 'medium' | 'heavy')}
              className="w-full px-3 py-2.5 rounded-2xl bg-[#F7F8FB] border-2 border-[#E6E8EE] focus:border-[#FF6B4A] focus:outline-none text-[14px] font-semibold text-[#1F2430] transition-colors duration-150"
            >
              <option value="light">Light (10 pts)</option>
              <option value="medium">Medium (20 pts)</option>
              <option value="heavy">Heavy (30 pts)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="type-label block mb-1">Description</label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Any details, supplies needed, or tips..."
            rows={3}
            className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F7F8FB] border-2 border-[#E6E8EE] focus:border-[#FF6B4A] focus:outline-none text-[14px] font-semibold text-[#1F2430] transition-colors duration-150"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            fullWidth
            disabled={submitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            loading={submitting}
            disabled={!name.trim() || submitting}
          >
            {submitting ? 'Saving...' : 'Add to pool'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
