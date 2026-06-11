package com.example.demo.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.demo.dto.ApiRes;
import com.example.demo.dto.req.TransactionCreateReq;
import com.example.demo.dto.req.TransactionUpdateReq;
import com.example.demo.dto.res.PageRes;
import com.example.demo.dto.res.TransactionRes;
import com.example.demo.service.LineTransactionNotifyService;
import com.example.demo.service.TransactionService;

@RestController
@RequestMapping("/api/transaction")
public class TransactionController {

    private final TransactionService transactionService;
    private final LineTransactionNotifyService lineTransactionNotifyService;

    public TransactionController(
            TransactionService transactionService,
            LineTransactionNotifyService lineTransactionNotifyService) {
        this.transactionService = transactionService;
        this.lineTransactionNotifyService = lineTransactionNotifyService;
    }

    @GetMapping("")
    public ResponseEntity<ApiRes<List<TransactionRes>>> listTransactions(
            @RequestParam UUID userId,
            @RequestParam(required = false) UUID cycleId) {
        List<TransactionRes> data = transactionService.listTransactions(userId, cycleId);
        return ResponseEntity.ok(ApiRes.success(data, "OK"));
    }

    /** GET /api/transaction/user/{userId}?page=0&size=10 — รายการธุรกรรมแบบแบ่งหน้า */
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiRes<PageRes<TransactionRes>>> listTransactionsByUser(
            @PathVariable UUID userId,
            @RequestParam(required = false) UUID cycleId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        PageRes<TransactionRes> data = transactionService.listTransactionsByUserPage(
                userId, cycleId, startDate, endDate, page, size);
        return ResponseEntity.ok(ApiRes.success(data, "OK"));
    }

    @GetMapping("/{txId}")
    public ResponseEntity<ApiRes<TransactionRes>> getTransaction(
            @PathVariable UUID txId,
            @RequestParam UUID userId) {
        TransactionRes data = transactionService.getTransaction(txId, userId);
        return ResponseEntity.ok(ApiRes.success(data, "OK"));
    }

    @PostMapping("")
    public ResponseEntity<ApiRes<TransactionRes>> createTransaction(@RequestBody TransactionCreateReq req) {
        TransactionRes data = transactionService.createTransaction(req);
        return ResponseEntity.ok(ApiRes.success(data, "Insert Success"));
    }

    @PutMapping("")
    public ResponseEntity<ApiRes<TransactionRes>> updateTransaction(@RequestBody TransactionUpdateReq req) {
        TransactionRes data = transactionService.updateTransaction(req);
        lineTransactionNotifyService.pushUpdatedTransactionCard(data);
        return ResponseEntity.ok(ApiRes.success(data, "Update Success"));
    }

    @DeleteMapping("")
    public ResponseEntity<ApiRes<Void>> deleteTransaction(
            @RequestParam UUID txId,
            @RequestParam UUID userId) {
        transactionService.deleteTransaction(txId, userId);
        return ResponseEntity.ok(ApiRes.success(null, "Delete Success"));
    }

    /** DELETE /api/transaction/user/{userId} — ลบธุรกรรมทั้งหมดของผู้ใช้ */
    @DeleteMapping("/user/{userId}")
    public ResponseEntity<ApiRes<Void>> deleteAllTransactionsByUser(@PathVariable UUID userId) {
        transactionService.deleteAllTransactionsByUser(userId);
        return ResponseEntity.ok(ApiRes.success(null, "Delete All Success"));
    }
}
