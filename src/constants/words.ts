// Common English words weighted toward a pharmacy/clinic/counter fingerspelling
// context. Used by the word-prediction helper to complete transcript prefixes.
// Lowercase, plain literal — no ordering guarantees relied on beyond "present".
export const COMMON_WORDS: string[] = [
  // Greetings & courtesy
  'hello', 'hi', 'hey', 'goodbye', 'bye', 'welcome', 'please', 'thanks', 'thank',
  'sorry', 'excuse', 'pardon', 'yes', 'no', 'okay', 'sure', 'maybe', 'good',
  'morning', 'afternoon', 'evening', 'night', 'day', 'today', 'tomorrow', 'yesterday',
  // Everyday function words
  'the', 'and', 'for', 'you', 'your', 'my', 'me', 'we', 'they', 'this', 'that',
  'here', 'there', 'now', 'later', 'soon', 'again', 'more', 'less', 'some', 'any',
  'all', 'none', 'need', 'want', 'have', 'has', 'had', 'can', 'could', 'would',
  'should', 'will', 'do', 'does', 'did', 'get', 'got', 'give', 'take', 'make',
  'help', 'wait', 'stop', 'start', 'go', 'come', 'know', 'think', 'look', 'see',
  'find', 'ask', 'tell', 'say', 'call', 'show', 'open', 'close', 'buy', 'pay',
  'sign', 'read', 'write', 'spell', 'name', 'number', 'phone', 'email', 'address',
  'time', 'date', 'week', 'month', 'year', 'hour', 'minute', 'left', 'right',
  'up', 'down', 'front', 'back', 'near', 'far', 'inside', 'outside',
  // People & roles
  'person', 'people', 'friend', 'family', 'doctor', 'nurse', 'pharmacist',
  'staff', 'manager', 'customer', 'patient', 'child', 'children', 'baby',
  'mother', 'father', 'parent', 'son', 'daughter', 'wife', 'husband',
  // Pharmacy / medical terms
  'pharmacy', 'prescription', 'medicine', 'medication', 'pill', 'pills', 'tablet',
  'capsule', 'dose', 'dosage', 'refill', 'pickup', 'dropoff', 'counter', 'clinic',
  'hospital', 'appointment', 'insurance', 'coverage', 'copay', 'allergy', 'allergic',
  'symptom', 'symptoms', 'pain', 'fever', 'cough', 'cold', 'flu', 'headache',
  'nausea', 'pressure', 'blood', 'sugar', 'diabetes', 'antibiotic', 'painkiller',
  'vitamin', 'supplement', 'ointment', 'cream', 'syrup', 'inhaler', 'injection',
  'bandage', 'mask', 'gloves', 'thermometer', 'label', 'instructions', 'directions',
  'warning', 'expire', 'expiry', 'brand', 'generic', 'strength', 'milligram',
  'daily', 'twice', 'nightly', 'morning', 'meal', 'food', 'water', 'empty',
  'stomach', 'side', 'effect', 'effects', 'renew', 'transfer', 'ready',
  // Common items
  'bag', 'box', 'bottle', 'card', 'cash', 'change', 'receipt', 'money', 'price',
  'cost', 'total', 'discount', 'coupon', 'wallet', 'key', 'keys', 'glasses',
  'wheelchair', 'walker', 'cane', 'phone', 'charger', 'paper', 'pen', 'pencil',
  'form', 'document', 'id', 'license', 'passport',
  // Descriptors
  'new', 'old', 'big', 'small', 'large', 'medium', 'hot', 'cold', 'warm', 'cool',
  'fast', 'slow', 'early', 'late', 'busy', 'free', 'ready', 'done', 'first', 'last',
  'next', 'other', 'same', 'different', 'important', 'urgent', 'safe', 'careful',
  'easy', 'hard', 'clear', 'sure', 'fine', 'well', 'sick', 'better', 'worse',
  // Actions / verbs (context)
  'confirm', 'cancel', 'change', 'update', 'check', 'verify', 'submit', 'return',
  'exchange', 'order', 'deliver', 'delivery', 'ship', 'send', 'receive', 'collect',
  'schedule', 'reschedule', 'book', 'register', 'signup', 'login', 'follow',
  'explain', 'understand', 'repeat', 'slower', 'louder', 'write', 'point',
  // Places & directions
  'store', 'shop', 'aisle', 'shelf', 'window', 'door', 'entrance', 'exit',
  'restroom', 'bathroom', 'parking', 'street', 'building', 'floor', 'room',
  'desk', 'table', 'chair', 'line', 'queue', 'area', 'section',
  // Time & scheduling
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'january', 'february', 'march', 'april', 'june', 'july', 'august',
  'september', 'october', 'november', 'december', 'weekend', 'holiday',
  // Numbers as words
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'zero', 'hundred', 'dozen', 'half', 'quarter',
  // Common names (for spelling context)
  'john', 'mary', 'james', 'linda', 'robert', 'sarah', 'michael', 'jennifer',
  'david', 'susan', 'william', 'karen', 'richard', 'lisa', 'thomas', 'nancy',
  'daniel', 'emily', 'anna', 'chris',
  // Misc everyday
  'water', 'coffee', 'tea', 'snack', 'lunch', 'dinner', 'breakfast', 'home',
  'work', 'school', 'car', 'bus', 'train', 'walk', 'drive', 'ride', 'ticket',
  'account', 'password', 'code', 'message', 'text', 'note', 'question', 'answer',
  'problem', 'issue', 'reason', 'because', 'about', 'with', 'without', 'from',
  'after', 'before', 'during', 'until', 'while', 'every', 'each', 'both', 'either',
];
