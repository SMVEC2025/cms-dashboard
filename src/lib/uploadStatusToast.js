import toast from 'react-hot-toast';

const DEFAULT_MESSAGES = [
  'Uploading image...',
  'It takes a bit long...',
  'Conerting images...',
];

export function startUploadStatusToast(messages = DEFAULT_MESSAGES, intervalMs = 1400) {
  const statusMessages = Array.isArray(messages) && messages.length ? messages : DEFAULT_MESSAGES;
  const toastId = toast.loading(statusMessages[0]);
  let index = 0;

  const timer = setInterval(() => {
    index = (index + 1) % statusMessages.length;
    toast.loading(statusMessages[index], { id: toastId });
  }, intervalMs);

  const clear = () => clearInterval(timer);

  return {
    id: toastId,
    success(message) {
      clear();
      toast.success(message, { id: toastId });
    },
    error(message) {
      clear();
      toast.error(message, { id: toastId });
    },
  };
}

