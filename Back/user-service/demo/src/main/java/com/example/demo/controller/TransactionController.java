package com.example.demo.controller;

import java.util.List;
import java.util.UUID;

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
import com.example.demo.dto.res.TransactionRes;
import com.example.demo.service.LineTransactionNotifyService;
import com.example.demo.service.TransactionService;
import com.example.demo.util.ApiResMapper;

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
        ApiRes<List<TransactionRes>> res = transactionService.listTransactions(userId, cycleId);
        return ApiResMapper.toResponseEntity(res);
    }

    /** GET /api/transaction/user/{userId} — รายการธุรกรรมของผู้ใช้ (cycleId กรองได้ผ่าน query) */
    @GetMapping("/user/{userId}")
    public ResponseEntity<ApiRes<List<TransactionRes>>> listTransactionsByUser(
            @PathVariable UUID userId,
            @RequestParam(required = false) UUID cycleId) {
        ApiRes<List<TransactionRes>> res = transactionService.listTransactions(userId, cycleId);
        return ApiResMapper.toResponseEntity(res);
    }

    @GetMapping("/{txId}")
    public ResponseEntity<ApiRes<TransactionRes>> getTransaction(
            @PathVariable UUID txId,
            @RequestParam UUID userId) {
        ApiRes<TransactionRes> res = transactionService.getTransaction(txId, userId);
        return ApiResMapper.toResponseEntity(res);
    }

    @PostMapping("")
    public ResponseEntity<ApiRes<TransactionRes>> createTransaction(@RequestBody TransactionCreateReq req) {
        ApiRes<TransactionRes> res = transactionService.createTransaction(req);
        return ApiResMapper.toResponseEntity(res);
    }

    @PutMapping("")
    public ResponseEntity<ApiRes<TransactionRes>> updateTransaction(@RequestBody TransactionUpdateReq req) {
        ApiRes<TransactionRes> res = transactionService.updateTransaction(req);
        if (res.success() && res.data() != null) {
            lineTransactionNotifyService.pushUpdatedTransactionCard(res.data());
        }
        return ApiResMapper.toResponseEntity(res);
    }

    @DeleteMapping("")
    public ResponseEntity<ApiRes<Void>> deleteTransaction(
            @RequestParam UUID txId,
            @RequestParam UUID userId) {
        ApiRes<Void> res = transactionService.deleteTransaction(txId, userId);
        return ApiResMapper.toResponseEntity(res);
    }

    /** DELETE /api/transaction/user/{userId} — ลบธุรกรรมทั้งหมดของผู้ใช้ */
    @DeleteMapping("/user/{userId}")
    public ResponseEntity<ApiRes<Void>> deleteAllTransactionsByUser(@PathVariable UUID userId) {
        ApiRes<Void> res = transactionService.deleteAllTransactionsByUser(userId);
        return ApiResMapper.toResponseEntity(res);
    }
}
