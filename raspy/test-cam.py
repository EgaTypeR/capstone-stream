import cv2

cap = cv2.VideoCapture(0)  # Try using different indices like 0, 1, 2 if the default camera doesn't work.

if not cap.isOpened():
    print("Error: Unable to access the camera")
else:
    print("Camera successfully opened")
    ret, frame = cap.read()
    if ret:
        print("Captured a frame!")
        cv2.imshow("Camera", frame)  # Show the frame for a visual test
        cv2.waitKey(0)
    cap.release()
    cv2.destroyAllWindows()