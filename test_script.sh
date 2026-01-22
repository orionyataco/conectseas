node server/index.js > server_test.log 2>&1 & SV_PID=$!; 
sleep 5; 

echo "1. Create Folder as User 1"
curl -s -X POST http://localhost:3002/api/drive/folders -H "Content-Type: application/json" -d '{"userId": 1, "name": "Shared Test Folder"}'

echo -e "\n2. Get User 1 Folders to find ID"
F_ID=$(curl -s "http://localhost:3002/api/drive/folders?userId=1" | grep -oP '{"id":\K\d+(?=,"user_id":1,"parent_id":null,"name":"Shared Test Folder")' | tail -n 1)
echo "Folder ID: $F_ID"

echo -e "\n3. Get Users to find User 2"
U2_ID=$(curl -s http://localhost:3002/api/users | grep -oP '{"id":\K\d+' | grep -v "^1$" | head -n 1)
echo "User 2 ID: $U2_ID"

echo -e "\n4. Share Folder with User 2 (READ)"
curl -s -X POST "http://localhost:3002/api/drive/folders/$F_ID/share" -H "Content-Type: application/json" -d "{\"userId\": 1, \"targetUserId\": $U2_ID, \"permission\": \"READ\"}"

echo -e "\n5. Verify User 2 can see the shared folder"
curl -s "http://localhost:3002/api/drive/folders?userId=$U2_ID" | grep "Shared Test Folder"

echo -e "\n6. Try to upload as User 2 (Should Fail with 403)"
echo "test" > test.txt
curl -s -i -X POST http://localhost:3002/api/drive/upload -F "file=@test.txt" -F "userId=$U2_ID" -F "folderId=$F_ID" | grep "HTTP/1.1 403"

echo -e "\n7. Update to WRITE permission"
curl -s -X POST "http://localhost:3002/api/drive/folders/$F_ID/share" -H "Content-Type: application/json" -d "{\"userId\": 1, \"targetUserId\": $U2_ID, \"permission\": \"WRITE\"}"

echo -e "\n8. Try to upload as User 2 (Should Succeed)"
curl -s -i -X POST http://localhost:3002/api/drive/upload -F "file=@test.txt" -F "userId=$U2_ID" -F "folderId=$F_ID" | grep "HTTP/1.1 200"

kill $SV_PID
rm test.txt
