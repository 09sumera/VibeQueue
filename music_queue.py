from collections import deque


class MusicQueue:

    def __init__(self):
        self.queue = deque()

    def enqueue(self, song):
        self.queue.append(song)

    def dequeue(self):
        if len(self.queue) == 0:
            return None

        return self.queue.popleft()

    def get_all(self):
        return list(self.queue)

    def clear(self):
        self.queue.clear()

    def size(self):
        return len(self.queue)