import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { MascotView } from '../../components/common/MascotView';
import { sound } from '../../services/sound';
import { Star, MessageSquare, Bug, Lightbulb, Check, Heart } from 'lucide-react';
import { useToast } from '../../components/common/Toast';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [rating, setRating] = useState<number>(5);
  const [category, setCategory] = useState<'rate' | 'problem' | 'feature'>('rate');
  const [message, setMessage] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playCelebration();
    setIsSubmitted(true);
    showToast('Feedback submitted! Thank you.', 'success');
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setMessage('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleReset}
      title={isSubmitted ? 'Thank you' : 'Feedback and suggestions'}
      subtitle={
        isSubmitted
          ? 'You help us make student living wonderful'
          : 'Tell us how Roomie can be even better'
      }
    >
      {isSubmitted ? (
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <MascotView
            state="celebrating"
            size="lg"
            bubbleText="You are awesome!"
          />
          <h3 className="type-title">
            Thanks for sharing your thoughts
          </h3>
          <p className="type-secondary max-w-xs leading-relaxed">
            Every rating and idea directly shapes future updates for university roomies.
          </p>
          <Button variant="primary" size="md" fullWidth onClick={handleReset}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category Tabs */}
          <div>
            <label className="type-label block mb-2">
              Feedback Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'rate', label: 'Rate App', icon: <Star className="w-4 h-4" /> },
                { id: 'problem', label: 'Report Bug', icon: <Bug className="w-4 h-4" /> },
                { id: 'feature', label: 'Idea', icon: <Lightbulb className="w-4 h-4" /> },
              ].map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => {
                    sound.playTap();
                    setCategory(c.id as any);
                  }}
                  className={`py-2 px-1 rounded-2xl border text-[14px] font-bold flex flex-col items-center gap-1 cursor-pointer transition-all ${
                    category === c.id
                      ? 'border-[#FF6B4A] bg-[#FFF0ED] text-[#FF6B4A]'
                      : 'border-[#E6E8EE] bg-white text-[#64748B]'
                  }`}
                >
                  {c.icon}
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Star rating if rating */}
          {category === 'rate' && (
            <div className="text-center py-2">
              <label className="type-label block mb-2">
                How is your roomie experience?
              </label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => {
                      sound.playPop();
                      setRating(star);
                    }}
                    className="p-1 cursor-pointer hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating
                          ? 'text-[#FFC93C] fill-[#FFC93C]'
                          : 'text-[#E6E8EE]'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <span className="type-section-heading text-[#8A6200] block mt-2">
                {rating === 5
                  ? 'Loved it! 5 Stars'
                  : rating === 4
                  ? 'Very good! 4 Stars'
                  : rating === 3
                  ? 'Okay (3 Stars)'
                  : 'Needs improvement'}
              </span>
            </div>
          )}

          {/* Details */}
          <div>
            <label className="type-label block mb-1">
              Your message:
            </label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                category === 'problem'
                  ? 'Describe the issue you experienced...'
                  : category === 'feature'
                  ? 'What feature would make living together even easier?'
                  : 'What do you love most about Roomie?'
              }
              className="w-full px-4 py-2.5 rounded-2xl border border-[#E6E8EE] bg-white type-body focus:outline-none focus:border-[#FF6B4A]"
            />
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              disabled={!message.trim()}
              icon={<Heart className="w-4 h-4" />}
            >
              Submit feedback
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
