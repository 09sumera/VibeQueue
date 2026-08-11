from queue import MusicQueue


music = MusicQueue()

music.enqueue("Perfect")
music.enqueue("Believer")
music.enqueue("Shape of You")

print("Music Queue:")
print(music.get_queue())

print("\nNext song:")
print(music.peek())

print("\nPlaying:")
print(music.dequeue())

print("\nQueue after playing:")
print(music.get_queue())

print("\nSongs remaining:")
print(music.size())