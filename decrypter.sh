#!/bin/bash

DECRYPTED_FOLDER="decrypted"  
mkdir $DECRYPTED_FOLDER

for f in *.pdf  
do  
    qpdf --decrypt --password="$1" "$f" "$DECRYPTED_FOLDER/$f"
done  

# https://www.ethanmick.com/author/ethan/
# https://www.ethanmick.com/decrypt-all-pdfs-in-a-directory/