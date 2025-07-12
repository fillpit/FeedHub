<template>
  <div class="auth-credential-management">
    <el-card>
      <div class="header">
        <span>授权信息管理</span>
        <el-button type="primary" @click="openDialog">新增授权</el-button>
      </div>
      <el-table :data="list" border style="width: 100%" v-loading="loading">
        <el-table-column prop="name" label="名称" width="120" />
        <el-table-column prop="authType" label="类型" width="100" />
        <el-table-column prop="cookie" label="Cookie" width="180" show-overflow-tooltip />
        <el-table-column prop="bearerToken" label="Bearer Token" width="180" show-overflow-tooltip />
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="customHeaders" label="自定义头" width="120">
          <template #default="scope">
            <span>{{ formatHeaders(scope.row.customHeaders) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" width="150" />
        <el-table-column label="操作" width="160">
          <template #default="scope">
            <el-button size="small" @click="edit(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" @click="remove(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑授权' : '新增授权'">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入名称" />
        </el-form-item>
        <el-form-item label="类型" prop="authType">
          <el-select v-model="form.authType" placeholder="请选择类型">
            <el-option label="Cookie" value="cookie" />
            <el-option label="Bearer Token" value="bearer" />
            <el-option label="Basic Auth" value="basic" />
            <el-option label="自定义头" value="custom" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="form.authType==='cookie'" label="Cookie" prop="cookie">
          <el-input v-model="form.cookie" type="textarea" rows="2" placeholder="请输入Cookie" />
        </el-form-item>
        <el-form-item v-if="form.authType==='bearer'" label="Bearer Token" prop="bearerToken">
          <el-input v-model="form.bearerToken" type="textarea" rows="2" placeholder="请输入Bearer Token" />
        </el-form-item>
        <template v-if="form.authType==='basic'">
          <el-form-item label="用户名" prop="username">
            <el-input v-model="form.username" placeholder="请输入用户名" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
            <el-input v-model="form.password" type="password" placeholder="请输入密码" />
          </el-form-item>
        </template>
        <el-form-item v-if="form.authType==='custom'" label="自定义头" prop="customHeaders">
          <el-input v-model="headersInput" type="textarea" rows="2" placeholder="请输入JSON格式，如 { 'X-Token': 'abc' }" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" placeholder="备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible=false">取消</el-button>
        <el-button type="primary" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { authCredentialApi } from '@/api/authCredential';
import type { AuthCredential } from '@/types';

const list = ref<AuthCredential[]>([]);
const loading = ref(false);
const dialogVisible = ref(false);
const isEdit = ref(false);
const form = reactive<AuthCredential>({
  name: '',
  authType: 'cookie',
  cookie: '',
  bearerToken: '',
  username: '',
  password: '',
  customHeaders: {},
  remark: ''
});
const headersInput = ref('');
const formRef = ref();
const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  authType: [{ required: true, message: '请选择类型', trigger: 'change' }],
};

function formatHeaders(headers: any) {
  if (!headers) return '';
  try {
    return JSON.stringify(headers);
  } catch {
    return '';
  }
}

function resetForm() {
  form.name = '';
  form.authType = 'cookie';
  form.cookie = '';
  form.bearerToken = '';
  form.username = '';
  form.password = '';
  form.customHeaders = {};
  form.remark = '';
  headersInput.value = '';
}

async function fetchList() {
  loading.value = true;
  try {
    const res = await authCredentialApi.getAll();
    list.value = res.data || [];
  } finally {
    loading.value = false;
  }
}

function openDialog() {
  resetForm();
  isEdit.value = false;
  dialogVisible.value = true;
}

function edit(row: AuthCredential) {
  Object.assign(form, row);
  headersInput.value = row.customHeaders ? JSON.stringify(row.customHeaders) : '';
  isEdit.value = true;
  dialogVisible.value = true;
}

async function remove(id?: number) {
  if (!id) return;
  await authCredentialApi.delete(id);
  ElMessage.success('删除成功');
  fetchList();
}

async function submit() {
  await formRef.value?.validate();
  // 处理自定义头
  if (form.authType === 'custom') {
    try {
      form.customHeaders = headersInput.value ? JSON.parse(headersInput.value) : {};
    } catch {
      ElMessage.error('自定义头格式错误');
      return;
    }
  } else {
    form.customHeaders = {};
  }
  if (isEdit.value && form.id) {
    await authCredentialApi.update(form.id, form);
    ElMessage.success('更新成功');
  } else {
    await authCredentialApi.create(form);
    ElMessage.success('创建成功');
  }
  dialogVisible.value = false;
  fetchList();
}

watch(dialogVisible, val => {
  if (!val) resetForm();
});

onMounted(fetchList);
</script>

<style scoped>
.auth-credential-management {
  padding: 24px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
</style> 