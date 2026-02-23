import os
import json
from bs4 import BeautifulSoup

# Folder containing HTML files
folder_path = "./"

search_index = []

for filename in os.listdir(folder_path):
    if filename.endswith(".html") and filename != "index.html":
        file_path = os.path.join(folder_path, filename)

        with open(file_path, "r", encoding="utf-8") as f:
            soup = BeautifulSoup(f, "html.parser")

            # Get course title (from h1)
            h1 = soup.find("h1")
            course_name = h1.text.strip() if h1 else "Unknown Course"

            # Extract book titles
            book_titles = soup.find_all("div", class_="book-title")

            for book in book_titles:
                title_text = book.get_text(strip=True)

                search_index.append({
                    "title": title_text,
                    "course": course_name,
                    "department": "Unknown Department",
                    "url": filename
                })

# Save JSON
with open("search-index.json", "w", encoding="utf-8") as f:
    json.dump(search_index, f, indent=2, ensure_ascii=False)

print("search-index.json generated successfully!")
